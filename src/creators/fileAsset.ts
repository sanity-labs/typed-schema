import {type OutputOf, type SchemaAnnotations} from '../defs'
import {defineType} from '../helpers/defineType'
import {FILE_ASSET} from '../shapeDefs'

/**
 * The `sanity.fileAsset` document type: the document a `file()` field's
 * `asset` reference points to.
 */
export function fileAsset(
  annotations?: SchemaAnnotations<OutputOf<typeof FILE_ASSET>>,
): typeof FILE_ASSET {
  return annotations ? defineType({...FILE_ASSET}, annotations) : FILE_ASSET
}
