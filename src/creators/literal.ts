import {type SanityLiteral, type SchemaAnnotations} from '../defs'
import {defineType} from '../helpers/defineType'

export function literal<T extends string | number | boolean>(
  value: T,
  annotations?: SchemaAnnotations<NoInfer<T>>,
): SanityLiteral<T> {
  return defineType({typeName: 'literal', value: value}, annotations)
}
