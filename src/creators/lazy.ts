import {
  type OutputOf,
  type SanityAny,
  type SanityLazy,
  type SchemaAnnotations,
} from '../defs'
import {defineType} from '../helpers/defineType'

export function lazy<T extends SanityAny>(
  getter: () => T,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<T>>>,
): SanityLazy<T> {
  return defineType({typeName: 'lazy', get: getter}, annotations)
}
