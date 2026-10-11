import {expect, test} from 'vitest'

import {document} from '../../../creators/document'
import {lazy} from '../../../creators/lazy'
import {literal} from '../../../creators/literal'
import {reference} from '../../../creators/reference'
import {string} from '../../../creators/string'
import {toClassicSchema} from '../toClassicSchema'
import {classicHuman} from './schemas/classic'
import {Human} from './schemas/typed'

test('toClassicSchema', () => {
  expect(toClassicSchema(Human)).toEqual(classicHuman)
})

test('a reference with several targets lists each document type', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Review = document({
    _type: literal('review'),
    subject: reference([Author, lazy(() => Book)]),
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
    subject: reference([Author, Book, Author]),
  })
  expect(toClassicSchema(Review)[0]).toMatchObject({
    fields: [{name: 'subject', to: [{type: 'author'}, {type: 'book'}]}],
  })
})
