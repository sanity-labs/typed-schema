import {expect, test} from 'vitest'

import {array} from '../../creators/array'
import {date} from '../../creators/date'
import {document} from '../../creators/document'
import {lazy} from '../../creators/lazy'
import {literal} from '../../creators/literal'
import {number} from '../../creators/number'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {reference} from '../../creators/reference'
import {string} from '../../creators/string'
import {union} from '../../creators/union'
import {type DocumentSchemaOf} from '../../defs'
import {
  ExampleError,
  validateExamples,
  validateExamplesOrThrow,
} from '../validateExamples'

test('passes when every example parses', () => {
  const Pet = document(
    {
      _type: literal('pet'),
      name: string({examples: ['Fido']}),
      born: optional(date({examples: ['2020-01-31']})),
      rank: number({min: 1, step: 1, examples: [1, 2]}),
    },
    {examples: [{_type: 'pet', name: 'Fido', rank: 1}]},
  )
  expect(validateExamplesOrThrow(Pet)).toBe(Pet)
  expect(validateExamples(Pet)).toEqual({ok: true, value: Pet})
})

test('reports examples that violate runtime constraints', () => {
  const Pet = document(
    {
      _type: literal('pet'),
      born: date({examples: ['31/01/2020']}),
      rank: number({min: 1, step: 1, examples: [0, 1.5]}),
      tags: array(string(), {examples: [['ok'], ['ok', 'ok']]}),
      friends: array(
        union([
          object({_type: literal('cat'), name: string({examples: [1 as any]})}),
          object({_type: literal('dog')}),
        ]),
      ),
    },
    {
      examples: [
        {_type: 'pet', born: '2020-01-31', rank: 0, tags: [], friends: []},
      ],
    },
  )
  const res = validateExamples(Pet)
  expect(res.ok).toBe(false)
  if (res.ok) return
  expect(
    res.error.failures.map(f => [f.schemaPath.join('.'), f.index]),
  ).toEqual([
    ['', 0],
    ['born', 0],
    ['rank', 0],
    ['rank', 1],
    ['friends.[].cat.name', 0],
  ])
  expect(res.error.message).toMatchInlineSnapshot(`
    "Invalid schema examples:
    (root) examples[0]: rank: Expected a number greater than, or equal to 1
    born examples[0]: Expected a date string on the format "YYYY-MM-DD"
    rank examples[0]: Expected a number greater than, or equal to 1
    rank examples[1]: Expected a number that is a multiple of 1
    friends.[].cat.name examples[0]: Expected a string"
  `)
  expect(() => validateExamplesOrThrow(Pet)).toThrow(ExampleError)
  expect(res.error.name).toBe('ExampleError')
})

test('validates element examples against the schema without _key', () => {
  const Address = object({city: string()}, {examples: [{city: 'Oslo'}]})
  const Doc = document({_type: literal('doc'), list: array(Address)})
  expect(validateExamples(Doc)).toEqual({ok: true, value: Doc})
  // examples on the array itself are array values, with keys
  const Keyed = document({
    _type: literal('doc'),
    list: array(Address, {examples: [[{city: 'Oslo', _key: 'a'}]]}),
  })
  expect(validateExamples(Keyed).ok).toBe(true)
  const Unkeyed = document({
    _type: literal('doc'),
    list: array(Address, {examples: [[{city: 'Oslo'} as any]]}),
  })
  expect(validateExamples(Unkeyed).ok).toBe(false)
})

test('stops on a lazy schema that builds a new node each time', () => {
  const make = (): any =>
    object({
      name: string({examples: ['x']}),
      child: optional(lazy(() => make())),
    })
  expect(validateExamples(make()).ok).toBe(true)
})

test('follows lazy schemas and stops on cycles', () => {
  interface Category {
    _type: 'category'
    title: string
    parent?: {_type: 'reference'; _ref: string}
  }
  const Category: DocumentSchemaOf<Category> = document(
    {
      _type: literal('category'),
      title: string(),
      parent: optional(
        lazy(() => reference(Category), {
          examples: [
            {_type: 'reference', _ref: 'root'},
            {_type: 'reference'} as any,
          ],
        }),
      ),
    },
    {examples: [{_type: 'category', title: 'Talks'}]},
  )
  const res = validateExamples(Category)
  expect(res.ok).toBe(false)
  if (res.ok) return
  expect(
    res.error.failures.map(f => [f.schemaPath.join('.'), f.index]),
  ).toEqual([['parent', 1]])
})

test('checks the examples of a union of documents and of its members', () => {
  const Author = document(
    {_type: literal('author'), name: string()},
    {examples: [{_type: 'author', name: 'Carl'}, {_type: 'author'} as any]},
  )
  const Book = document({_type: literal('book'), title: string()})
  const Subjects = union([Author, lazy(() => Book)], {
    examples: [{_type: 'book', title: 'Cosmos'}, {_type: 'magazine'} as any],
  })
  const res = validateExamples(Subjects)
  expect(res.ok).toBe(false)
  if (res.ok) return
  expect(
    res.error.failures.map(f => [f.schemaPath.join('.'), f.index]),
  ).toEqual([
    ['', 1],
    ['author', 1],
  ])
})
