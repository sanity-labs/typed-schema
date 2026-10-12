import {expect, test} from 'vitest'

import {array} from '../../../creators/array'
import {block} from '../../../creators/block'
import {document} from '../../../creators/document'
import {image} from '../../../creators/image'
import {lazy} from '../../../creators/lazy'
import {literal} from '../../../creators/literal'
import {portableText} from '../../../creators/portableText'
import {reference} from '../../../creators/reference'
import {string} from '../../../creators/string'
import {union} from '../../../creators/union'
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
