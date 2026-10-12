import {
  type ImageSchema,
  type ObjectShape,
  type OutputOf,
  type SchemaAnnotations,
} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {type FieldErrors} from '../helpers/schemaErrors'
import {ImageBase, type ImageShape} from '../shapeDefs'

// TODO: add hotspot + crop
export function image(): ImageSchema<ImageShape>
export function image<Shape extends {[key: string]: any} = ObjectShape>(
  shape: Shape & NoInfer<FieldErrors<Shape>>,
  annotations?: NoInfer<
    SchemaAnnotations<OutputOf<ImageSchema<Shape & ImageShape>>>
  >,
): ImageSchema<Shape & ImageShape>
export function image(
  shape: ObjectShape = {},
  annotations?: SchemaAnnotations<any>,
): ImageSchema {
  return defineType(
    {
      typeName: 'image',
      shape: {...ImageBase.shape, ...deferGetters(shape)},
    },
    annotations,
  )
}
