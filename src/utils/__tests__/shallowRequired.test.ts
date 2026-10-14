import {expect, test} from 'vitest'

import {document} from '../../creators/document'
import {literal} from '../../creators/literal'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {string} from '../../creators/string'
import {parse} from '../../parse'
import {shallowRequired} from '../shallowRequired'

const typeNames = (schema: {shape: Record<string, {typeName: string}>}) =>
  Object.fromEntries(
    Object.entries(schema.shape).map(([k, v]) => [k, v.typeName]),
  )

test('makes top-level fields required, but not nested ones', () => {
  const schema = object({
    a: optional(string()),
    sub: optional(object({c: optional(string())})),
  })
  const req = shallowRequired(schema)
  expect(typeNames(req)).toEqual({a: 'string', sub: 'object'})
  expect(typeNames(req.shape.sub as any)).toEqual({c: 'optional'})
  expect(parse(req, {a: 'x'}).ok).toBe(false)
  expect(parse(req, {a: 'x', sub: {}}).ok).toBe(true)
})

test('works on documents and keeps them documents', () => {
  const doc = document({_type: literal('pet'), name: optional(string())})
  const req = shallowRequired(doc)
  expect(req.typeName).toBe('document')
  expect(typeNames(req)).toMatchObject({_id: 'string', name: 'string'})
})

test('throws on a schema that is not an object or document', () => {
  expect(() => shallowRequired(string() as any)).toThrow(
    'Expected object or document schema',
  )
})
