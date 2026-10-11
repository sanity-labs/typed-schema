import {assert, describe, expect, test, vi} from 'vitest'

import {document} from '../../creators/document'
import {lazy} from '../../creators/lazy'
import {literal} from '../../creators/literal'
import {optional} from '../../creators/optional'
import {reference} from '../../creators/reference'
import {string} from '../../creators/string'
import {type Infer, REF_SCHEMA, type SanityDocumentType} from '../../defs'
import {parse, parseOrThrow} from '../../parse'
import {
  type SanityDocumentValue,
  type SanityReferenceValue,
} from '../../shapeDefs'
import {createDocumentLoader} from '../createDocumentLoader'
import {createLoader} from '../createLoader'
import {
  createLoadReferenceResult,
  createReferenceLoader,
} from '../createReferenceLoader'

const committedFields = {
  _rev: 'r1',
  _createdAt: '2024-01-01T00:00:00Z',
  _updatedAt: '2024-01-01T00:00:00Z',
}

const Country = document({
  _type: literal('country'),
  name: string(),
})

const Person = document({
  _type: literal('person'),
  firstName: string(),
  lastName: string(),
  country: reference(Country),
})

test('resolve reference with schema', async () => {
  const personResult = parse(Person, {
    _id: 'carl',
    _type: 'person',
    firstName: 'Carl',
    lastName: 'Sagan',
    country: {_type: 'reference', _ref: 'usa'},
  })
  assert(personResult.ok)
  const person = personResult.value

  const usa = {_type: 'country', _id: 'usa', ...committedFields, name: 'USA'}
  const fetch = vi.fn().mockResolvedValueOnce(usa)
  const loadReference = createReferenceLoader(fetch)

  const personCountry = await loadReference(person.country)
  expect(fetch.mock.calls).toEqual([
    ['usa', ['_type', '_id', '_createdAt', '_updatedAt', '_rev', 'name']],
  ])
  expect(personCountry).toEqual(usa)
})

test('loadReference rejects a target without the committed fields', async () => {
  const personResult = parse(Person, {
    _type: 'person',
    firstName: 'Carl',
    lastName: 'Sagan',
    country: {_type: 'reference', _ref: 'usa'},
  })
  assert(personResult.ok)
  const person = personResult.value
  const fetch = vi.fn().mockResolvedValueOnce({
    _type: 'country',
    _id: 'usa',
    name: 'USA',
  })
  const loadReference = createReferenceLoader(fetch)
  await expect(loadReference(person.country)).rejects.toThrow(/_createdAt/)
})

test('loadReference rejects when the target does not match its schema', async () => {
  const personResult = parse(Person, {
    _type: 'person',
    firstName: 'Carl',
    lastName: 'Sagan',
    country: {_type: 'reference', _ref: 'usa'},
  })
  assert(personResult.ok)
  const person = personResult.value
  const fetch = vi.fn().mockResolvedValueOnce({
    _type: 'country',
    _id: 'usa',
    ...committedFields,
  })
  const loadReference = createReferenceLoader(fetch)
  await expect(loadReference(person.country)).rejects.toThrow(/name/)
})

test('createLoader loads references and documents in bulk', async () => {
  const personResult = parse(Person, {
    _type: 'person',
    firstName: 'Carl',
    lastName: 'Sagan',
    country: {_type: 'reference', _ref: 'usa'},
  })
  assert(personResult.ok)
  const person = personResult.value
  const fetch = vi.fn((id: string) =>
    Promise.resolve({
      _type: 'country',
      _id: id,
      ...committedFields,
      name: id.toUpperCase(),
    }),
  )
  const {loadDocuments, loadReferences} = createLoader(fetch)

  expect(await loadReferences([person.country, person.country])).toEqual([
    {_type: 'country', _id: 'usa', ...committedFields, name: 'USA'},
    {_type: 'country', _id: 'usa', ...committedFields, name: 'USA'},
  ])
  expect(await loadDocuments(Country, ['usa', 'nor'])).toEqual([
    {_type: 'country', _id: 'usa', ...committedFields, name: 'USA'},
    {_type: 'country', _id: 'nor', ...committedFields, name: 'NOR'},
  ])
})

test('resolving a reference without schema falls back to the document base', async () => {
  const person: Infer<typeof Person> = {
    _type: 'person',
    firstName: 'Carl',
    lastName: 'Sagan',
    country: {_type: 'reference', _ref: 'usa'},
  }
  const fetch = vi.fn().mockResolvedValueOnce({
    _type: 'country',
    _id: 'usa',
    ...committedFields,
    name: 'USA',
  })
  const loadReference = createReferenceLoader(fetch)

  const personCountry = await loadReference(person.country)
  expect(fetch.mock.calls).toEqual([
    ['usa', ['_type', '_id', '_createdAt', '_updatedAt', '_rev']],
  ])
  // parsed against the document base, so only the system fields survive
  expect(personCountry).toEqual({
    _type: 'country',
    _id: 'usa',
    ...committedFields,
  })
})

test('document loader selects the document fields and parses the result', async () => {
  const usa = {_type: 'country', _id: 'usa', ...committedFields, name: 'USA'}
  const fetch = vi.fn().mockResolvedValueOnce(usa)
  const loadDocument = createDocumentLoader(fetch)
  expect(await loadDocument(Country, 'usa')).toEqual(usa)
  expect(fetch.mock.calls).toEqual([
    ['usa', ['_type', '_id', '_createdAt', '_updatedAt', '_rev', 'name']],
  ])

  fetch.mockResolvedValueOnce({
    _type: 'country',
    _id: 'usa',
    ...committedFields,
  })
  await expect(loadDocument(Country, 'usa')).rejects.toThrow(/name/)

  fetch.mockResolvedValueOnce({_type: 'country', _id: 'usa', name: 'USA'})
  await expect(loadDocument(Country, 'usa')).rejects.toThrow(/_createdAt/)
})

test('document loader resolves lazy document schemas', async () => {
  const usa = {_type: 'country', _id: 'usa', ...committedFields, name: 'USA'}
  const fetch = vi.fn().mockResolvedValueOnce(usa)
  const loadDocument = createDocumentLoader(fetch)
  expect(
    await loadDocument(
      lazy(() => Country),
      'usa',
    ),
  ).toEqual(usa)
  expect(fetch.mock.calls[0]?.[1]).toContain('name')
})

test('loadReference stays typed for a recursive schema annotated with SanityReferenceValue', async () => {
  interface TreeNode extends SanityDocumentValue {
    name: string
    parent?: SanityReferenceValue<TreeNode>
  }
  const TreeNode: SanityDocumentType<TreeNode> = document({
    _type: literal('node'),
    name: string(),
    parent: optional(lazy(() => reference(TreeNode))),
  })

  const root = {_type: 'node', _id: 'root', ...committedFields, name: 'root'}
  const fetch = vi.fn().mockResolvedValueOnce(root)
  const loadReference = createReferenceLoader(fetch)
  const childResult = parse(TreeNode, {
    _type: 'node',
    name: 'child',
    parent: {_type: 'reference', _ref: 'root'},
  })
  assert(childResult.ok)
  const child = childResult.value

  const parent = await loadReference(child.parent!)
  expect(parent).toEqual(root)
})

test('loadReference selects the fields of a lazy reference target', async () => {
  const Book = document({
    _type: literal('book'),
    title: string(),
    author: reference(lazy(() => Country)),
  })
  const bookResult = parse(Book, {
    _type: 'book',
    title: 'Cosmos',
    author: {_type: 'reference', _ref: 'usa'},
  })
  assert(bookResult.ok)
  const fetch = vi.fn().mockResolvedValueOnce({
    _type: 'country',
    _id: 'usa',
    ...committedFields,
    name: 'USA',
  })
  const loadReference = createReferenceLoader(fetch)
  await loadReference(bookResult.value.author)
  expect(fetch.mock.calls).toEqual([
    ['usa', ['_type', '_id', '_createdAt', '_updatedAt', '_rev', 'name']],
  ])
})

test('loadReferenceResult passes an explicit field selection through', async () => {
  const personResult = parse(Person, {
    _type: 'person',
    firstName: 'Carl',
    lastName: 'Sagan',
    country: {_type: 'reference', _ref: 'usa'},
  })
  assert(personResult.ok)
  const usa = {_type: 'country', _id: 'usa', ...committedFields, name: 'USA'}
  const fetch = vi.fn().mockResolvedValueOnce(usa)
  const loadReferenceResult = createLoadReferenceResult(fetch)

  const result = await loadReferenceResult(personResult.value.country, [
    '_id',
    'name',
  ])
  expect(fetch.mock.calls).toEqual([['usa', ['_id', 'name']]])
  expect(result).toEqual({ok: true, value: usa})
})

describe('a reference with several targets', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({
    _type: literal('book'),
    title: string(),
    author: reference(Author),
  })
  const Review = document({
    _type: literal('review'),
    subject: reference([Author, lazy(() => Book)]),
  })
  const review = parseOrThrow(Review, {
    _type: 'review',
    subject: {_type: 'reference', _ref: 'cosmos'},
  })
  const cosmos = {
    _type: 'book',
    _id: 'cosmos',
    ...committedFields,
    title: 'Cosmos',
    author: {_type: 'reference', _ref: 'carl'},
  }

  test('selects the fields of every target', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(cosmos)
    await createReferenceLoader(fetch)(review.subject)
    expect(fetch.mock.calls).toEqual([
      [
        'cosmos',
        [
          '_type',
          '_id',
          '_createdAt',
          '_updatedAt',
          '_rev',
          'name',
          'title',
          'author',
        ],
      ],
    ])
  })

  test('parses the document against the target with a matching _type', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(cosmos)
    const subject = await createReferenceLoader(fetch)(review.subject)
    expect(subject).toEqual(cosmos)
    assert(subject._type === 'book')
    expect(subject.author[REF_SCHEMA]).toBe(Author)
  })

  test('reports field errors in a document of a target type', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({...cosmos, title: 42})
    await expect(createReferenceLoader(fetch)(review.subject)).rejects.toThrow(
      /title/,
    )
  })

  test('rejects lazy targets with the same _type before fetching', async () => {
    const OtherAuthor = document({
      _type: literal('author'),
      fullName: string(),
    })
    const Mixed = reference([Author, lazy(() => OtherAuthor)])
    const ref = parseOrThrow(Mixed, {_type: 'reference', _ref: 'carl'})
    const fetch = vi.fn()
    await expect(createReferenceLoader(fetch)(ref)).rejects.toThrow(
      'reference() targets must have different _type literals, but more than one has _type "author"',
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  test('rejects a document of another type', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({...cosmos, _type: 'magazine'})
      .mockResolvedValueOnce(null)
    const loadReferenceResult = createLoadReferenceResult(fetch)
    const result = await loadReferenceResult(review.subject)
    assert(!result.ok)
    expect(result.error.issues).toEqual([
      {
        code: 'INVALID_OBJECT_UNION',
        path: ['_type'],
        message:
          'Expected a referenced document of type "author" or "book", got "magazine"',
      },
    ])
    const missing = await loadReferenceResult(review.subject)
    assert(!missing.ok)
    expect(missing.error.issues).toEqual([
      {
        code: 'INVALID_TYPE',
        path: [],
        message: 'Expected a referenced document of type "author" or "book"',
      },
    ])
  })
})
