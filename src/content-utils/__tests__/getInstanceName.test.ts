import {expect, test} from 'vitest'

import {document} from '../../creators/document'
import {literal} from '../../creators/literal'
import {object} from '../../creators/object'
import {string} from '../../creators/string'
import {type ObjectSchema} from '../../defs'
import {getInstanceName} from '../getInstanceName'

test('returns the `_type` literal of an object or document', () => {
  expect(getInstanceName(object({_type: literal('pet')}))).toBe('pet')
  expect(getInstanceName(document({_type: literal('owner')}))).toBe('owner')
})

test('returns undefined for an object without `_type`', () => {
  expect(getInstanceName(object({name: string()}))).toBeUndefined()
})

test('throws when `_type` is not a string literal', () => {
  const withType = (type: unknown) =>
    ({typeName: 'object', shape: {_type: type}}) as unknown as ObjectSchema

  expect(() => getInstanceName(withType(literal(1)))).toThrow(
    'Expected _type literal to be a string, instead found: number',
  )
  expect(() => getInstanceName(withType(string()))).toThrow(
    'Expected _type property to be a literal string, instead found: string',
  )
})
