import {
  type ObjectSchema,
  type ObjectShape,
  type OutputOf,
  type SchemaAnnotations,
} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {type FieldErrors} from '../helpers/schemaErrors'

export function object<Shape extends {[key: string]: any} = ObjectShape>(
  shape: Shape & NoInfer<FieldErrors<Shape, '_type'>>,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<ObjectSchema<Shape>>>>,
): ObjectSchema<Shape> {
  return defineType(
    {typeName: 'object', shape: deferGetters(shape)},
    annotations,
  )
}
