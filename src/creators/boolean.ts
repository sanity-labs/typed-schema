import {type BooleanSchema, type SchemaAnnotations} from '../defs'
import {defineType} from '../helpers/defineType'

export function boolean(
  annotations?: SchemaAnnotations<boolean>,
): BooleanSchema {
  return defineType({typeName: 'boolean'}, annotations)
}
