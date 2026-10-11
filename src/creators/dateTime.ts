import {type SanityDateTime, type SchemaAnnotations} from '../defs'
import {defineType} from '../helpers/defineType'

export function dateTime(
  annotations?: SchemaAnnotations<string>,
): SanityDateTime {
  return defineType({typeName: 'dateTime'}, annotations)
}
