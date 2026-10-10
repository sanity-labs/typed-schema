import {expect, test} from 'vitest'

import {array} from '../../creators/array'
import {document} from '../../creators/document'
import {literal} from '../../creators/literal'
import {number} from '../../creators/number'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {string} from '../../creators/string'
import {union} from '../../creators/union'
import {parse} from '../../parse'
import {deepPartial} from '../deepPartial'

test('deep partial on nested object', () => {
  const u = union([
    object({_type: literal('some'), str: string()}),
    object({_type: literal('other'), num: number(), hint: string()}),
  ])
  const obj = object({
    foo: string(),
    sub: object({
      prop: number(),
      array: array(u),
    }),
  })

  expect(parse(deepPartial(obj), {})).toEqual({})
  expect(
    parse(deepPartial(obj), {
      sub: {
        array: [{_type: 'some', _key: 'xyz', hint: 'hello'}],
      },
    }),
  ).toMatchInlineSnapshot(`
    {
      "sub": {
        "array": [
          {
            "_key": "xyz",
            "_type": "some",
          },
        ],
      },
    }
  `)
})

test('deep partial on documents keeps them documents', () => {
  const doc = document({
    _type: literal('pet'),
    name: string(),
    owner: object({name: string()}),
  })
  const partial = deepPartial(doc)
  expect(partial.typeName).toBe('document')
  expect(parse(partial, {_type: 'pet'})).toEqual({_type: 'pet'})
  expect(parse(partial, {_type: 'pet', owner: {}})).toEqual({
    _type: 'pet',
    owner: {},
  })
})

test('deep partial does not double wrap optional fields', () => {
  const schema = object({a: optional(string())})
  const partial = deepPartial(schema)
  expect(partial.shape.a.typeName).toBe('optional')
  expect((partial.shape.a as any).type.typeName).toBe('string')
})
