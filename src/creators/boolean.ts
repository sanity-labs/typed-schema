import {type SanityBoolean, type SchemaAnnotations} from '../defs'
import {defineType} from '../helpers/defineType'

export function boolean(
  annotations?: SchemaAnnotations<boolean>,
): SanityBoolean {
  return defineType({typeName: 'boolean'}, annotations)
}
