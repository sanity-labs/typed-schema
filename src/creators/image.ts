import {type SanityImage, type SanityObjectShape} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {ImageBase, type SanityImageShape} from '../shapeDefs'

// TODO: Make `shape` optional, add hotspot + crop
export function image<Shape extends SanityObjectShape = SanityObjectShape>(
  shape: Shape,
): SanityImage<Shape & SanityImageShape> {
  return defineType({
    typeName: 'image',
    shape: {...ImageBase.shape, ...deferGetters(shape)},
  })
}
