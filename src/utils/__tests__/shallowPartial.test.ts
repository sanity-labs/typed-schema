import {expect, test} from 'vitest'

import {document} from '../../creators/document'
import {literal} from '../../creators/literal'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {string} from '../../creators/string'
import {parse} from '../../parse'
import {shallowPartial} from '../shallowPartial'

const typeNames = (schema: {shape: Record<string, {typeName: string}>}) =>
  Object.fromEntries(
    Object.entries(schema.shape).map(([k, v]) => [k, v.typeName]),
  )

test('makes top-level fields optional, but not nested ones', () => {
  const schema = object({
    _type: literal('thing'),
    a: string(),
    b: optional(string()),
    sub: object({c: string()}),
  })
  const partial = shallowPartial(schema)
  expect(typeNames(partial)).toEqual({
    _type: 'literal',
    a: 'optional',
    b: 'optional',
    sub: 'optional',
  })
  // already-optional fields are not double wrapped
  expect((partial.shape.b as any).type.typeName).toBe('string')
  expect(parse(partial, {_type: 'thing'})).toEqual({
    ok: true,
    value: {_type: 'thing'},
  })
  expect(parse(partial, {_type: 'thing', sub: {}}).ok).toBe(false)
})

test('works on documents and keeps them documents', () => {
  const doc = document({_type: literal('pet'), name: string()})
  const partial = shallowPartial(doc)
  expect(partial.typeName).toBe('document')
  expect(parse(partial, {_type: 'pet'})).toEqual({
    ok: true,
    value: {_type: 'pet'},
  })
})

test('makes document fields optional, but keeps _type and nested fields required', () => {
  const Pet = document({
    _type: literal('pet'),
    name: string(),
    owner: object({name: string()}),
  })
  const partial = shallowPartial(Pet)
  expect(typeNames(partial)).toMatchObject({
    _type: 'literal',
    _id: 'optional',
    name: 'optional',
    owner: 'optional',
  })
  expect(parse(partial, {_type: 'pet', name: 'Fido'})).toEqual({
    ok: true,
    value: {
      _type: 'pet',
      name: 'Fido',
    },
  })
  expect(parse(partial, {}).ok).toBe(false)
  expect(parse(partial, {_type: 'pet', owner: {}}).ok).toBe(false)
  expect(parse(partial, {_type: 'pet', owner: {name: 'Ann'}}).ok).toBe(true)
})
