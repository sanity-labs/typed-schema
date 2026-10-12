import {type OptionalSchema, type Schema} from '../defs'
import {defineType} from '../helpers/defineType'

export function optional<T extends Schema>(type: T): OptionalSchema<T> {
  return defineType({typeName: 'optional', type: type})
}
