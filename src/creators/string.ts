import {type SanityString, type SchemaAnnotations} from '../defs'
import {defineType} from '../helpers/defineType'

export function string(annotations?: SchemaAnnotations<string>): SanityString {
  return defineType({typeName: 'string'}, annotations)
}
