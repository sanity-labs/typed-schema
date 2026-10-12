import {type DateSchema, type SchemaAnnotations} from '../defs'
import {defineType} from '../helpers/defineType'

export function date(annotations?: SchemaAnnotations<string>): DateSchema {
  return defineType({typeName: 'date'}, annotations)
}
