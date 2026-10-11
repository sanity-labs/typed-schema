import {expect, test} from 'vitest'

import {document} from '../creators/document'
import {literal} from '../creators/literal'
import {never} from '../creators/never'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'

test('typed object union excludes never types', () => {
  const Union = union([
    object({
      _type: literal('ok'),
      name: string(),
    }),
    never(),
  ])
  const neverType = Union.union.find(schema => {
    // @ts-expect-error - should not be in type system
    return schema.typeName === 'never'
  })
  expect(neverType).toBeUndefined()
})
test('primitive union excludes never types', () => {
  const Union = union([string(), number(), never()])
  const neverType = Union.union.find(schema => {
    // @ts-expect-error - should not be in type system
    return schema.typeName === 'never'
  })
  expect(neverType).toBeUndefined()
})

test('object union with more than one reference throws', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Link = object({_type: literal('link'), href: string()})
  const message =
    'union() can have only one reference() member. Use one reference() with several targets instead, e.g. reference([Author, Book])'

  // Typed as an array of unknown length, which the type check does not cover
  const members = [reference(Author), reference(Book)]
  expect(() => union(members)).toThrow(message)
  expect(() =>
    // @ts-expect-error - a nested union with a reference
    union([reference(Author), union([reference(Book), Link])]),
  ).toThrow(message)
  expect(() => union([reference(Author), Link])).not.toThrow()
})
