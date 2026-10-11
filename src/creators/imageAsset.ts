import {type OutputOf, type SchemaAnnotations} from '../defs'
import {defineType} from '../helpers/defineType'
import {IMAGE_ASSET} from '../shapeDefs'

/**
 * The `sanity.imageAsset` document type: the document an `image()` field's
 * `asset` reference points to.
 */
export function imageAsset(
  annotations?: SchemaAnnotations<OutputOf<typeof IMAGE_ASSET>>,
): typeof IMAGE_ASSET {
  return annotations ? defineType({...IMAGE_ASSET}, annotations) : IMAGE_ASSET
}
