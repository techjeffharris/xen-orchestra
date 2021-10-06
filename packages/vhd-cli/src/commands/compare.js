import { getSyncedHandler } from '@xen-orchestra/fs'
import { openVhd, Constants } from 'vhd-lib'
import { resolve } from 'path'
import Disposable from 'promise-toolbox/Disposable'

const deepCompareObjects = (src, dest, path) => {
  for (const key of Object.keys(src)) {
    const srcValue = src[key]
    const destValue = dest[key]
    if (typeof srcValue !== typeof destValue) {
      throw new Error(
        `Error checking header : key ${path + '/' + key} is of type *${srcValue}* in source and *${destValue}* in dest`
      )
    }

    if (typeof src[key] === 'object') {
      deepCompareObjects(src[key], dest[key], path + '/' + key)
    } else {
      if (
        srcValue !== destValue ||
        (Buffer.isBuffer(srcValue) && Buffer.isBuffer(destValue) && !srcValue.equals(destValue))
      ) {
        throw new Error(
          `Error checking comparing objects : key ${
            path + '/' + key
          } is *${srcValue}* in source and *${destValue}* in dest`
        )
      }
    }
  }
}

export default async args => {
  if (args.length < 2 || args.some(_ => _ === '-h' || _ === '--help')) {
    return `Usage: compare <source VHD> <destination> `
  }
  const [sourcePath, destPath] = args

  await Disposable.use(async function* () {
    const handler = yield getSyncedHandler({ url: 'file:///' })
    const src = yield openVhd(handler, resolve(sourcePath))
    const dest = yield openVhd(handler, resolve(destPath))

    deepCompareObjects(src.header, dest.header, 'header')
    deepCompareObjects(src.footer, dest.footer, 'footer')

    await src.readBlockAllocationTable()
    await dest.readBlockAllocationTable()

    for (let i = 0; i < src.header.maxTableEntries; i++) {
      if (src.containsBlock(i)) {
        if (dest.containsBlock(i)) {
          const srcBlock = await src.readBlock(i)
          const destBlock = await dest.readBlock(i)

          if (!srcBlock.buffer.equals(destBlock.buffer)) {
            throw new Error(`Block  ${i} has different data in src and dest`)
          }
        } else {
          throw new Error(`Block  ${i} is present in source but not in dest `)
        }
      } else if (dest.containsBlock(i)) {
        throw new Error(`Block  ${i} is present in dest but not in source `)
      }
    }

    for (let parentLocatorId = 0; parentLocatorId < Constants.PARENT_LOCATOR_ENTRIES; parentLocatorId++) {
      const parentLocatorData = await src.readParentLocatorData(parentLocatorId)
      const destData = await dest.readParentLocatorData(parentLocatorId)
      if (parentLocatorData) {
        if (!destData || !parentLocatorData.equals(destData)) {
          throw new Error(`Parent Locator  ${parentLocatorId} has different data in src and dest`)
        }
      } else if (destData) {
        throw new Error(`Parent Locator  ${parentLocatorId} is present in dest but not in source `)
      }
    }
    console.log('there is no difference between theses vhd')
  })
}