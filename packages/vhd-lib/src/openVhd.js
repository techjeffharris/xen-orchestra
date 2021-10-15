import { VhdFile, VhdDirectory } from './'

export const openVhd = async function (handler, path, opts) {
  try {
    return await VhdFile.open(handler, path, opts)
  } catch (e) {
    if (e.code !== 'EISDIR') {
      throw e
    }
    return await VhdDirectory.open(handler, path, opts)
  }
}
