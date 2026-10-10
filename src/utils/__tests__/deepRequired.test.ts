import {expect, test} from 'vitest'

import {array} from '../../creators/array'
import {document} from '../../creators/document'
import {literal} from '../../creators/literal'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {string} from '../../creators/string'
import {parse, safeParse} from '../../parse'
import {deepRequired} from '../deepRequired'

const typeNames = (schema: {shape: Record<string, {typeName: string}>}) =>
  Object.fromEntries(
    Object.entries(schema.shape).map(([k, v]) => [k, v.typeName]),
  )

test('makes every field required, recursively', () => {
  const schema = object({
    a: optional(string()),
    sub: object({b: optional(string())}),
    arr: array(object({c: optional(string())})),
  })
  const req = deepRequired(schema)
  expect(typeNames(req)).toEqual({
    a: 'string',
    sub: 'object',
    arr: 'objectArray',
  })
  expect(typeNames(req.shape.sub as any)).toEqual({b: 'string'})
  expect(safeParse(req, {a: 'x', sub: {}, arr: []}).status).toBe('fail')
  expect(
    parse(req, {a: 'x', sub: {b: 'y'}, arr: [{_key: 'k', c: 'z'}]}),
  ).toEqual({a: 'x', sub: {b: 'y'}, arr: [{_key: 'k', c: 'z'}]})
})

test('unwraps a top-level optional', () => {
  const req = deepRequired(optional(object({a: optional(string())})))
  expect(req.typeName).toBe('object')
  expect(typeNames(req as any)).toEqual({a: 'string'})
})

test('works on documents and keeps them documents', () => {
  const doc = document({_type: literal('pet'), name: optional(string())})
  const req = deepRequired(doc)
  expect(req.typeName).toBe('document')
  expect(typeNames(req)._id).toBe('string')
  expect(typeNames(req).name).toBe('string')
  expect(safeParse(req, {_type: 'pet'}).status).toBe('fail')
})
