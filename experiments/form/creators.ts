import {type Schema} from '../../src/defs'
import {type FormDef} from './types'

export function defineForm<S extends Schema>(type: S, form: FormDef<S>) {
  return form
}
