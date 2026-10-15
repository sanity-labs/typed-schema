import {expect, test, vi} from 'vitest'

import {array} from '../../../creators/array'
import {block} from '../../../creators/block'
import {date} from '../../../creators/date'
import {dateTime} from '../../../creators/dateTime'
import {document} from '../../../creators/document'
import {enum as enumOf} from '../../../creators/enum'
import {image} from '../../../creators/image'
import {lazy} from '../../../creators/lazy'
import {literal} from '../../../creators/literal'
import {never} from '../../../creators/never'
import {number} from '../../../creators/number'
import {object} from '../../../creators/object'
import {optional} from '../../../creators/optional'
import {portableText} from '../../../creators/portableText'
import {reference} from '../../../creators/reference'
import {string} from '../../../creators/string'
import {union} from '../../../creators/union'
import {type DocumentSchema, type Schema} from '../../../defs'
import {toClassicSchema} from '../toClassicSchema'
import {classicHuman} from './schemas/classic'
import {Human} from './schemas/typed'

test('toClassicSchema', () => {
  expect(toClassicSchema(Human)).toEqual(classicHuman)
})

test('images and references in Portable Text', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Article = document({
    _type: literal('article'),
    body: portableText({
      block: block({inline: reference(Author)}),
      element: union([image({alt: string()}), reference(Author)]),
    }),
  })

  expect(toClassicSchema(Article)).toEqual([
    {
      type: 'document',
      name: 'article',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
              name: 'block',
              of: [
                {
                  type: 'object',
                  name: 'span',
                  fields: [
                    {name: 'marks', type: 'array', of: [{type: 'string'}]},
                    {name: 'text', type: 'string'},
                  ],
                },
                {type: 'reference', to: {type: 'author'}},
              ],
            },
            {
              type: 'image',
              name: 'image',
              fields: [{name: 'alt', type: 'string'}],
            },
            {type: 'reference', to: {type: 'author'}},
          ],
        },
      ],
    },
  ])
})

test('a reference to a union of documents lists each document type', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Review = document({
    _type: literal('review'),
    subject: reference(union([Author, lazy(() => Book)])),
  })
  expect(toClassicSchema(Review)).toEqual([
    {
      type: 'document',
      name: 'review',
      fields: [
        {
          name: 'subject',
          type: 'reference',
          to: [{type: 'author'}, {type: 'book'}],
        },
      ],
    },
  ])
})

test('a target listed twice appears once', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Review = document({
    _type: literal('review'),
    subject: reference(union([Author, Book, Author])),
  })
  expect(toClassicSchema(Review)[0]).toMatchObject({
    fields: [{name: 'subject', to: [{type: 'author'}, {type: 'book'}]}],
  })
})

test('a union of references converts like a reference to a union', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Review = document({
    _type: literal('review'),
    subjects: array(union([reference(Author), reference(Book)])),
  })
  expect(toClassicSchema(Review)[0]).toMatchObject({
    fields: [
      {
        name: 'subjects',
        type: 'array',
        of: [{type: 'reference', to: [{type: 'author'}, {type: 'book'}]}],
      },
    ],
  })
})

test('a union of documents outside a reference throws', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Review = document({
    _type: literal('review'),
    subject: union([Author, Book]),
  })
  expect(() => toClassicSchema(Review)).toThrow(
    'A union() of documents can only be a reference() target in a classic schema',
  )
})

test('literal, date and enum fields', () => {
  const Post = document({
    _type: literal('post'),
    kind: literal('news'),
    publishedOn: date(),
    status: enumOf(['draft', 'published']),
    priority: enumOf({Low: 1, High: 2}),
  })
  expect(toClassicSchema(Post)[0]).toMatchObject({
    fields: [
      {name: 'kind', type: 'string', options: {list: ['news']}},
      {name: 'publishedOn', type: 'date'},
      {
        name: 'status',
        type: 'string',
        options: {
          list: [
            {title: 'draft', value: 'draft'},
            {title: 'published', value: 'published'},
          ],
        },
      },
      {
        name: 'priority',
        type: 'number',
        options: {
          list: [
            {title: 'Low', value: 1},
            {title: 'High', value: 2},
          ],
        },
      },
    ],
  })
})

test('an enum with mixed value types falls back to string and warns', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const Post = document({
      _type: literal('post'),
      rating: enumOf({None: 'none', One: 1}),
    })
    expect(toClassicSchema(Post)[0]).toMatchObject({
      fields: [{name: 'rating', type: 'string'}],
    })
    expect(warn).toHaveBeenCalledOnce()
  } finally {
    warn.mockRestore()
  }
})

test('date, datetime and number array items', () => {
  const Calendar = document({
    _type: literal('calendar'),
    days: array(date()),
    moments: array(dateTime()),
    scores: array(number()),
  })
  expect(toClassicSchema(Calendar)[0]).toMatchObject({
    fields: [
      {name: 'days', type: 'array', of: [{type: 'date'}]},
      {name: 'moments', type: 'array', of: [{type: 'datetime'}]},
      {name: 'scores', type: 'array', of: [{type: 'number'}]},
    ],
  })
})

test('a primitive union array item converts to its first member', () => {
  const Doc = document({
    _type: literal('doc'),
    values: array(union([string(), number()])),
  })
  expect(toClassicSchema(Doc)[0]).toMatchObject({
    fields: [{name: 'values', type: 'array', of: [{type: 'string'}]}],
  })
})

test('never() is left out of fields, array items and unions', () => {
  const Pet = object({_type: literal('pet'), name: string()})
  const Doc = document({
    _type: literal('doc'),
    nothing: never(),
    empty: array(never()),
    pets: array(union([never(), Pet])),
  })
  expect(toClassicSchema(Doc)[0]).toEqual({
    type: 'document',
    name: 'doc',
    fields: [
      {name: 'empty', type: 'array', of: []},
      {
        name: 'pets',
        type: 'array',
        of: [
          {
            type: 'object',
            name: 'pet',
            fields: [{name: 'name', type: 'string'}],
          },
        ],
      },
    ],
  })
})

test('throws on a document without a string `_type` literal', () => {
  const Untyped = document({_type: literal('doc')})
  const schema = {
    ...Untyped,
    shape: {...Untyped.shape, _type: string()},
  } as unknown as DocumentSchema
  expect(() => toClassicSchema(schema)).toThrow(
    'Expected _type property of schema to be a string literal',
  )
})

test('throws on a lazy reference target that is not a document', () => {
  const Pet = object({_type: literal('pet'), name: string()})
  const Doc = document({
    _type: literal('doc'),
    // reference() checks its target on creation, but not a lazy one
    pet: reference(lazy(() => Pet as unknown as DocumentSchema)),
  })
  expect(() => toClassicSchema(Doc)).toThrow(
    'References can only reference documents, not other types',
  )
})

test('throws on a reference to a document without a `_type` literal', () => {
  const Author = document({_type: literal('author')})
  const Untyped = {
    ...Author,
    shape: {...Author.shape, _type: string()},
  } as unknown as DocumentSchema
  const Doc = document({_type: literal('doc'), author: reference(Untyped)})
  expect(() => toClassicSchema(Doc)).toThrow(
    'References can only reference named document types',
  )
})

test('throws on an unsupported array item type', () => {
  const Doc = document({
    _type: literal('doc'),
    statuses: array(enumOf(['a', 'b']) as any),
  })
  expect(() => toClassicSchema(Doc)).toThrow('Unsupported schema type enum')
})

test('a lazy union of documents in an array throws', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Review = document({
    _type: literal('review'),
    // array() checks its element on creation, but not a lazy one
    subjects: array(lazy(() => union([Author, Book])) as any),
  })
  expect(() => toClassicSchema(Review)).toThrow(
    'A union() of documents can only be a reference() target in a classic schema',
  )
})

test('throws when untyped objects nest past the depth limit', () => {
  // each resolution builds a new schema, so the cycle is never seen by identity
  const nested = (): Schema => object({child: optional(lazy(nested))})
  const Doc = document({_type: literal('doc'), root: nested()})
  expect(() => toClassicSchema(Doc as DocumentSchema)).toThrow(
    'objects are nested more than 100 levels deep',
  )
})
