import {type DateTimeSchema, type SchemaAnnotations} from '../defs'
import {defineType} from '../helpers/defineType'

export function dateTime(
  annotations?: SchemaAnnotations<string>,
): DateTimeSchema {
  return defineType({typeName: 'dateTime'}, annotations)
}
