import {test} from 'vitest'

import {document} from '../creators/document'
import {file} from '../creators/file'
import {image} from '../creators/image'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {string} from '../creators/string'
import {type SanityLiteral, type SanityString} from '../defs'
import {extend} from '../utils/extend'

test('field values must be schemas', () => {
  const Base = object({_type: literal('base'), name: string()})

  // @ts-expect-error - 'bar' is not a schema
  object({_type: literal('x'), foo: 'bar'})
  // @ts-expect-error - a creator function is not a schema
  object({_type: literal('x'), foo: string})
  // @ts-expect-error - 'bar' is not a schema
  document({_type: literal('x'), foo: 'bar'})
  // @ts-expect-error - 'bar' is not a schema
  extend(Base, {foo: 'bar'})
  // @ts-expect-error - 'bar' is not a schema
  image({foo: 'bar'})
  // @ts-expect-error - 'bar' is not a schema
  file({foo: 'bar'})
  // @ts-expect-error - a schema needs an output type
  object({_type: literal('x'), foo: {typeName: 'string'}})

  object({_type: literal('x'), foo: string(), bar: optional(number())})
  document({_type: literal('x'), foo: string()})
  extend(Base, {foo: string()})
})

test('a non-schema value next to a getter field is rejected', () => {
  // A self-reference would also become `any` here, because the call fails
  object({
    _type: literal('node'),
    // @ts-expect-error - 1 is not a schema
    value: 1,
    get next() {
      return optional(string())
    },
  })
})

test('optional fields of a typed shape are checked', () => {
  const invalid: {_type: SanityLiteral<'x'>; foo?: string} = {
    _type: literal('x'),
  }
  // @ts-expect-error - foo is not a schema
  object(invalid)

  const valid: {_type: SanityLiteral<'x'>; foo?: SanityString} = {
    _type: literal('x'),
  }
  object(valid)
})
