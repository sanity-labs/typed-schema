import {expect, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {type DocumentSchemaOf} from '../defs'
import {parse} from '../parse'
import {type DocumentValue} from '../shapeDefs'

test('recursive schemas stay plain, serializable objects after parsing', () => {
  type Person = DocumentValue & {
    name: string
    friends: {_type: 'reference'; _ref: string; _key: string}[]
  }
  const person: DocumentSchemaOf<Person> & {shape: Record<string, unknown>} =
    document({
      _type: literal('person'),
      name: string(),
      friends: lazy(() => array(reference(person))),
    })
  const value = {
    _type: 'person',
    name: 'Ann',
    friends: [{_type: 'reference', _ref: 'bob', _key: 'k1'}],
  }
  expect(parse(person, value)).toEqual({ok: true, value})
  // parse again to exercise the cache
  expect(parse(person, value)).toEqual({ok: true, value})

  expect(Object.keys(person.shape.friends as object)).toEqual([
    'typeName',
    'get',
  ])
  expect(() => JSON.stringify(person)).not.toThrow()
})

test('nested lazy schemas resolve', () => {
  const schema = object({
    nested: lazy(() => lazy(() => optional(string()))),
  })
  expect(parse(schema, {nested: 'x'})).toEqual({ok: true, value: {nested: 'x'}})
  expect(parse(schema, {})).toEqual({ok: true, value: {}})
})
