import {literal} from '../creators/literal'
import {
  type DocumentSchema,
  type LiteralSchema,
  type ObjectSchema,
} from '../defs'
import {extend, type Extends} from './extend'
import {omit} from './omit'

export function rename<
  const T extends ObjectSchema | DocumentSchema,
  const K extends string,
>(type: T, newName: K): Extends<T, {_type: LiteralSchema<K>}> {
  return extend(omit(type, ['_type']) as any, {_type: literal(newName)}) as any
}
