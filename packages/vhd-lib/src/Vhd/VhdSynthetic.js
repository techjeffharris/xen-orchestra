import { asyncMap } from '@xen-orchestra/async-map'
import { createLogger } from '@xen-orchestra/log'
import { VhdAbstract } from './VhdAbstract'
import { FOOTER_SIZE, HEADER_SIZE } from './_constants'

const { debug } = createLogger('vhd-lib:VhdDirectory')


export class VhdSynthetic extends VhdAbstract {

  #vhds = []
  set header() {
    throw new Error('Header is read only for VhdSynthetic')
  }

  get header() {
    // this the VHD we want to synthetize
    const vhd = this.#vhds[0]

    // this is the root VHD
    const rootVhd = this.#vhds[this.#vhds.length - 1]

    // data of our synthetic VHD
    // TODO: set parentLocatorEntry-s in header
    return {
      ...vhd.header,
      tableOffset: FOOTER_SIZE + HEADER_SIZE,
      parentTimestamp: rootVhd.header.parentTimestamp,
      parentUnicodeName: rootVhd.header.parentUnicodeName,
      parentUuid: rootVhd.header.parentUuid,
    }
  }

  set footer() {
    throw new Error('Footer is read only for VhdSynthetic')
  }
  get footer(){
    return {
      ...this.#vhds[0].footer,
      dataOffset: FOOTER_SIZE,
      diskType: rootVhd.footer.diskType,
    }
  }

  static async open(vhds) {
    const vhd = new VhdSynthetic(vhds)
    return {
      dispose: () => {},
      value: vhd,
    }
  }

  constructor(vhds) {
    super()
    this.#vhds = vhds
  }

  async readBlockAllocationTable() {
    await asyncMap(this.#vhds, vhd=>vhd.readBlockAllocationTable())
  }

  containsBlock(blockId) {
    const contains = await asyncMap(this.#vhds, vhd=>vhd.containsBlock(blockId))
    return contains.includes(true)
  }

  async readHeaderAndFooter() {
    await asyncMap(this.#vhds, vhd=>vhd.readHeaderAndFooter())
  }

  async readBlock(blockId, onlyBitmap = false) {
    const contains = await asyncMap(this.#vhds, vhd=>vhd.containsBlock(blockId))
    // only read the content of the last vhd containing this block
    return this.#vhds[contains.lastIndexOf(true)].readBlock(blockId, onlyBitmap)
  }

  _readParentLocatorData(id) {
    return this.#vhds[0]._readParentLocatorData(_id)
  }

}
