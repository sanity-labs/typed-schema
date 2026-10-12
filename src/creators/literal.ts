import {type LiteralSchema, type SchemaAnnotations} from '../defs'
import {defineType} from '../helpers/defineType'

export function literal<T extends string | number | boolean>(
  value: T,
  annotations?: SchemaAnnotations<NoInfer<T>>,
): LiteralSchema<T> {
  return defineType({typeName: 'literal', value: value}, annotations)
}
