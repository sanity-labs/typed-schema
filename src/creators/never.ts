import {type NeverSchema} from '../defs'
import {defineType} from '../helpers/defineType'

export function never(): NeverSchema {
  return defineType({typeName: 'never'})
}
