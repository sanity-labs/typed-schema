import {
  type LazySchema,
  type OutputOf,
  type Schema,
  type SchemaAnnotations,
} from '../defs'
import {defineType} from '../helpers/defineType'

export function lazy<T extends Schema>(
  getter: () => T,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<T>>>,
): LazySchema<T> {
  return defineType({typeName: 'lazy', get: getter}, annotations)
}
