import {type SanityDate, type SchemaAnnotations} from '../defs'
import {defineType} from '../helpers/defineType'

export function date(annotations?: SchemaAnnotations<string>): SanityDate {
  return defineType({typeName: 'date'}, annotations)
}
