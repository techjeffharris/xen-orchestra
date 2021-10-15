import { openVhd, VhdSynthetic } from '.'
import { Disposable } from 'promise-toolbox'

export default async function createSyntheticStream(handler, paths) {
  await Disposable.use(function* () {
    const vhds = []
    for (const path of paths) {
      vhds.push(yield openVhd(handler, path))
    }
    const vhd = yield VhdSynthetic.open(vhds)
    vhd.readBlockAllocationTable()
    // @todo : can I do a return from a disposable ?
    return vhd.vhdStream()
  })
}
