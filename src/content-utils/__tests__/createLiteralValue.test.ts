import {expect, test} from 'vitest'

import {document} from '../../creators/document'
import {literal} from '../../creators/literal'
import {object} from '../../creators/object'
import {string} from '../../creators/string'
import {createLiteralValue} from '../createLiteralValue'

test('create literal value from document schema', () => {
  const Cat = document({
    _type: literal('cat'),
    sound: literal('miau'),
    breed: string(),
    metadata: object({
      tag: literal('xyz'),
    }),
    name: string(),
  })
  const myCat = createLiteralValue(Cat)
  expect(myCat).toEqual({
    _type: 'cat',
    metadata: {
      tag: 'xyz',
    },
    sound: 'miau',
  })
})

test('create literal value from literal schema', () => {
  const SomeLiteral = literal('lit')
  const myLit = createLiteralValue(SomeLiteral)
  expect(myLit).toEqual('lit')
})

test('create literal value from object schema', () => {
  const schema = object({foo: literal('bar'), someString: string()})
  const value = createLiteralValue(schema)
  expect(value).toEqual({foo: 'bar'})
})
