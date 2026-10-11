import {expect, test, vi} from 'vitest'

import {document} from '../../creators/document'
import {lazy} from '../../creators/lazy'
import {literal} from '../../creators/literal'
import {optional} from '../../creators/optional'
import {reference} from '../../creators/reference'
import {string} from '../../creators/string'
import {type Infer, type SanityDocumentType} from '../../defs'
import {parse} from '../../parse'
import {
  type SanityDocumentValue,
  type SanityReferenceValue,
} from '../../shapeDefs'
import {createDocumentLoader} from '../createDocumentLoader'
import {createLoader} from '../createLoader'
import {createReferenceLoader} from '../createReferenceLoader'

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
  const person = parse(Person, {
    _id: 'carl',
    _type: 'person',
    firstName: 'Carl',
    lastName: 'Sagan',
    country: {_type: 'reference', _ref: 'usa'},
  })

  const usa = {_type: 'country', _id: 'usa', ...committedFields, name: 'USA'}
  const fetch = vi.fn().mockResolvedValueOnce(usa)
  const loadReference = createReferenceLoader(fetch)

  const personCountry = await loadReference(person.country)
  expect(fetch.mock.calls).toEqual([['usa', []]])
  expect(personCountry).toEqual(usa)
})

test('loadReference rejects a target without the committed fields', async () => {
  const person = parse(Person, {
    _type: 'person',
    firstName: 'Carl',
    lastName: 'Sagan',
    country: {_type: 'reference', _ref: 'usa'},
  })
  const fetch = vi.fn().mockResolvedValueOnce({
    _type: 'country',
    _id: 'usa',
    name: 'USA',
  })
  const loadReference = createReferenceLoader(fetch)
  await expect(loadReference(person.country)).rejects.toThrow(/_createdAt/)
})

test('loadReference rejects when the target does not match its schema', async () => {
  const person = parse(Person, {
    _type: 'person',
    firstName: 'Carl',
    lastName: 'Sagan',
    country: {_type: 'reference', _ref: 'usa'},
  })
  const fetch = vi.fn().mockResolvedValueOnce({
    _type: 'country',
    _id: 'usa',
    ...committedFields,
  })
  const loadReference = createReferenceLoader(fetch)
  await expect(loadReference(person.country)).rejects.toThrow(/name/)
})

test('createLoader loads references and documents in bulk', async () => {
  const person = parse(Person, {
    _type: 'person',
    firstName: 'Carl',
    lastName: 'Sagan',
    country: {_type: 'reference', _ref: 'usa'},
  })
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
  const child = parse(TreeNode, {
    _type: 'node',
    name: 'child',
    parent: {_type: 'reference', _ref: 'root'},
  })

  const parent = await loadReference(child.parent!)
  expect(parent).toEqual(root)
})
