import {expect, test} from 'vitest'

import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {type SanityType} from '../defs'
import {type SanityDocumentValue} from '../shapeDefs'

const Author = document({_type: literal('author'), name: string()})
const Book = document({_type: literal('book'), title: string()})

test('a reference keeps its target', () => {
  expect(reference(Author).referenceType).toBe(Author)
  const Targets = union([Author, Book])
  expect(reference(Targets).referenceType).toBe(Targets)
})

test('targets with the same _type throw', () => {
  const OtherAuthor = document({_type: literal('author'), fullName: string()})
  expect(() => reference(union([Author, Book, OtherAuthor]))).toThrow(
    'reference() targets must have different _type literals, but more than one has _type "author"',
  )
})

test('a union with no targets throws', () => {
  // a type error too, since `union([])` is not a union of documents
  expect(() => reference(union([]) as any)).toThrow(
    'reference() needs a union() with at least one document schema',
  )
})

test('a target listed twice, or lazy targets with the same _type, do not throw', () => {
  const OtherAuthor = document({_type: literal('author'), fullName: string()})
  expect(() => reference(union([Author, Author]))).not.toThrow()
  // checked by the loader once resolved
  expect(() =>
    reference(union([Author, lazy(() => OtherAuthor)])),
  ).not.toThrow()
})

test('a target that is not a document throws, even when typed as one', () => {
  interface Folder extends SanityDocumentValue {
    name: string
  }
  // typed by its value, but an object at runtime
  const Folder: SanityType<Folder> = object({
    _type: literal('folder'),
    name: string(),
  })
  expect(() => reference(Folder)).toThrow(
    'reference() target must be a document schema, got object',
  )
})
