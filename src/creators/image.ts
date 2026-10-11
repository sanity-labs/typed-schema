import {type SanityImage, type SanityObjectShape} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {type FieldErrors} from '../helpers/schemaErrors'
import {ImageBase, type SanityImageShape} from '../shapeDefs'

// TODO: add hotspot + crop
export function image(): SanityImage<SanityImageShape>
export function image<Shape extends {[key: string]: any} = SanityObjectShape>(
  shape: Shape & NoInfer<FieldErrors<Shape>>,
): SanityImage<Shape & SanityImageShape>
export function image(shape: SanityObjectShape = {}): SanityImage {
  return defineType({
    typeName: 'image',
    shape: {...ImageBase.shape, ...deferGetters(shape)},
  })
}
