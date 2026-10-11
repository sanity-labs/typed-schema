import {expect, test} from 'vitest'

import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {reference} from '../creators/reference'
import {string} from '../creators/string'

const Author = document({_type: literal('author'), name: string()})
const Book = document({_type: literal('book'), title: string()})

test('a reference keeps its targets', () => {
  expect(reference(Author).referenceType).toBe(Author)
  expect(reference([Author, Book]).referenceType).toEqual([Author, Book])
})

test('targets with the same _type throw', () => {
  const OtherAuthor = document({_type: literal('author'), fullName: string()})
  expect(() => reference([Author, Book, OtherAuthor])).toThrow(
    'reference() targets must have different _type literals, but more than one has _type "author"',
  )
})

test('an empty list of targets throws', () => {
  const targets: (typeof Author)[] = []
  expect(() => reference(targets)).toThrow(
    'reference() needs at least one target document schema',
  )
})

test('the same target twice and lazy targets do not throw', () => {
  const OtherAuthor = document({_type: literal('author'), fullName: string()})
  expect(() => reference([Author, Author])).not.toThrow()
  // checked by the loader once resolved
  expect(() => reference([Author, lazy(() => OtherAuthor)])).not.toThrow()
})
