import {type SchemaAnnotations, type StringSchema} from '../defs'
import {defineType} from '../helpers/defineType'

export function string(annotations?: SchemaAnnotations<string>): StringSchema {
  return defineType({typeName: 'string'}, annotations)
}
