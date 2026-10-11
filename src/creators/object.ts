import {
  type OutputOf,
  type SanityObject,
  type SanityObjectShape,
  type SchemaAnnotations,
} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {type FieldErrors} from '../helpers/schemaErrors'

export function object<Shape extends {[key: string]: any} = SanityObjectShape>(
  shape: Shape & NoInfer<FieldErrors<Shape, '_type'>>,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<SanityObject<Shape>>>>,
): SanityObject<Shape> {
  return defineType(
    {typeName: 'object', shape: deferGetters(shape)},
    annotations,
  )
}
