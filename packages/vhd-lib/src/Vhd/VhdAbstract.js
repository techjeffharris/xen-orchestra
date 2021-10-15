import { computeBatSize, sectorsRoundUpNoZero, sectorsToBytes } from './_utils'
import {
  PLATFORM_NONE,
  SECTOR_SIZE,
  PLATFORM_W2KU,
  PARENT_LOCATOR_ENTRIES,
  FOOTER_SIZE,
  HEADER_SIZE,
  BLOCK_UNUSED,
} from '../_constants'
import assert from 'assert'
import asyncIteratorToStream from 'async-iterator-to-stream/dist'
import { checksumStruct, fuFooter, fuHeader } from '../_structs'

export class VhdAbstract {
  #header
  bitmapSize
  footer
  fullBlockSize
  sectorsOfBitmap
  sectorsPerBlock

  get header() {
    assert.notStrictEqual(this.#header, undefined, `header must be read before it's used`)
    return this.#header
  }

  set header(header) {
    this.#header = header
    this.sectorsPerBlock = header.blockSize / SECTOR_SIZE
    this.sectorsOfBitmap = sectorsRoundUpNoZero(this.sectorsPerBlock >> 3)
    this.fullBlockSize = sectorsToBytes(this.sectorsOfBitmap + this.sectorsPerBlock)
    this.bitmapSize = sectorsToBytes(this.sectorsOfBitmap)
  }

  /**
   * instantiate a Vhd
   *
   * @returns {AbstractVhd}
   */
  static async open() {
    throw new Error('open not implemented')
  }

  /**
   * Check if this vhd contains a block with id blockId
   * Must be called after readBlockAllocationTable
   *
   * @param {number} blockId
   * @returns {boolean}
   *
   */
  containsBlock(blockId) {
    throw new Error(`checking if this vhd contains the block ${blockId} is not implemented`)
  }

  /**
   * Read the header and the footer
   * check their integrity
   * if checkSecondFooter also checks that the footer at the end is equal to the one at the beginning
   *
   * @param {boolean} checkSecondFooter
   */
  readHeaderAndFooter(checkSecondFooter = true) {
    throw new Error(
      `reading and checking footer, ${checkSecondFooter ? 'second footer,' : ''} and header is not implemented`
    )
  }

  readBlockAllocationTable() {
    throw new Error(`reading block allocation table is not implemented`)
  }

  /**
   *
   * @param {number} blockId
   * @param {boolean} onlyBitmap
   * @returns {Buffer}
   */
  readBlock(blockId, onlyBitmap = false) {
    throw new Error(`reading  ${onlyBitmap ? 'bitmap of block' : 'block'} ${blockId} is not implemented`)
  }

  /**
   * coalesce the block with id blockId from the child vhd into
   * this vhd
   *
   * @param {AbstractVhd} child
   * @param {number} blockId
   *
   * @returns {number} the merged data size
   */
  coalesceBlock(child, blockId) {
    throw new Error(`coalescing the block ${blockId} from ${child} is not implemented`)
  }

  /**
   * ensure the bat size can store at least entries block
   * move blocks if needed
   * @param {number} entries
   */
  ensureBatSize(entries) {
    throw new Error(`ensuring batSize can store at least  ${entries} is not implemented`)
  }

  // Write a context footer. (At the end and beginning of a vhd file.)
  writeFooter(onlyEndFooter = false) {
    throw new Error(`writing footer   ${onlyEndFooter ? 'only at end' : 'on both side'} is not implemented`)
  }

  writeHeader() {
    throw new Error(`writing header is not implemented`)
  }

  _writeParentLocatorData(parentLocatorId, platformDataOffset, data) {
    throw new Error(`write Parent locator ${parentLocatorId} is not implemented`)
  }

  _readParentLocatorData(parentLocatorId, platformDataOffset, platformDataSpace) {
    throw new Error(`read Parent locator ${parentLocatorId} is not implemented`)
  }
  // common
  get batSize() {
    return computeBatSize(this.header.maxTableEntries)
  }

  async writeParentLocator({ id, platformCode = PLATFORM_NONE, data = Buffer.alloc(0) }) {
    assert(id >= 0, 'parent Locator id must be a positive number')
    assert(id < PARENT_LOCATOR_ENTRIES, `parent Locator id  must be less than ${PARENT_LOCATOR_ENTRIES}`)

    await this._writeParentLocatorData(id, data)

    const entry = this.header.parentLocatorEntry[id]
    const dataSpaceSectors = Math.ceil(data.length / SECTOR_SIZE)
    entry.platformCode = platformCode
    entry.platformDataSpace = dataSpaceSectors * SECTOR_SIZE
    entry.platformDataLength = data.length
  }

  async readParentLocator(id) {
    assert(id >= 0, 'parent Locator id must be a positive number')
    assert(id < PARENT_LOCATOR_ENTRIES, `parent Locator id  must be less than ${PARENT_LOCATOR_ENTRIES}`)
    const data = await this._readParentLocatorData(id)
    // offset is storage specific, don't expose it
    const { platformCode } = this.header.parentLocatorEntry[id]
    return {
      platformCode,
      id,
      data,
    }
  }

  async setUniqueParentLocator(fileNameString) {
    await this.writeParentLocator({
      id: 0,
      code: PLATFORM_W2KU,
      data: Buffer.from(fileNameString, 'utf16le'),
    })

    for (let i = 1; i < PARENT_LOCATOR_ENTRIES; i++) {
      await this.writeParentLocator({
        id: i,
        code: PLATFORM_NONE,
        data: Buffer.alloc(0),
      })
    }
  }

  async *blocks() {
    const nBlocks = this.header.maxTableEntries
    for (let blockId = 0; blockId < nBlocks; ++blockId) {
      if (await this.containsBlock(blockId)) {
        yield await this.readBlock(blockId)
      }
    }
  }

  vhdStream() {
    const { header, footer, batSize } = this
    const rawFooter = fuFooter.pack(footer)
    checksumStruct(rawFooter, fuFooter)

    // compute parent locator place and size
    // update them in header
    // update checksum in header

    let offset = FOOTER_SIZE + HEADER_SIZE + batSize
    for (let i = 0; i < PARENT_LOCATOR_ENTRIES; i++) {
      if (header.parentLocatorEntry[i].platformDataSpace > 0) {
        header.parentLocatorEntry[i].platformDataOffset = offset
        offset += header.parentLocatorEntry[i].platformDataSpace
      }
    }

    const rawHeader = fuHeader.pack(header)
    checksumStruct(rawHeader, fuHeader)

    assert.strictEqual(offset % SECTOR_SIZE, 0)

    const bat = Buffer.allocUnsafe(batSize)
    let offsetSector = offset / SECTOR_SIZE
    const blockSizeInSectors = this.fullBlockSize / SECTOR_SIZE

    // compute BAT , blocks starts after parent locator entries
    for (let i = 0; i < header.maxTableEntries; i++) {
      if (this.containsBlock(i)) {
        bat.writeUInt32BE(offsetSector, i * 4)
        offsetSector += blockSizeInSectors
      } else {
        bat.writeUInt32BE(BLOCK_UNUSED)
      }
    }
    const fileSize = offsetSector * SECTOR_SIZE + FOOTER_SIZE

    async function* iterator() {
      yield rawFooter
      yield rawHeader
      yield bat

      // yield parent locator entries
      for (let i = 0; i < PARENT_LOCATOR_ENTRIES; i++) {
        const parentLocator = await this.readParentLocator(i)
        yield parentLocator.data
      }

      // yield all blocks
      // since contains() can be costly for synthetic vhd, use the computed bat
      for (let i = 0; i < header.maxTableEntries; i++) {
        if (bat.readUInt32BE(i) !== BLOCK_UNUSED) {
          const block = this.readBlock(i)
          yield block.buffer
        }
      }
      // yield footer again
      yield rawFooter
    }

    const stream = asyncIteratorToStream(iterator())
    stream.length = fileSize
    return stream
  }
}
