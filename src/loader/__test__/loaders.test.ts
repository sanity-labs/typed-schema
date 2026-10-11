import {expect, expectTypeOf, test, vi} from 'vitest'

import {document} from '../../creators/document'
import {lazy} from '../../creators/lazy'
import {literal} from '../../creators/literal'
import {optional} from '../../creators/optional'
import {reference} from '../../creators/reference'
import {string} from '../../creators/string'
import {type Infer, type Parsed, type SanityDocumentType} from '../../defs'
import {type StoredDocument} from '../../lifecycle'
import {parse} from '../../parse'
import {
  type SanityDocumentValue,
  type SanityReferenceValue,
} from '../../shapeDefs'
import {createDocumentLoader} from '../createDocumentLoader'
import {
  createReferenceLoader,
  type DocumentLike,
} from '../createReferenceLoader'

const Country = document({
  _type: literal('country'),
  name: string(),
})

const PersonType = document({
  _type: literal('person'),
  firstName: string(),
  lastName: string(),
  country: reference(Country),
})

test('resolve reference with schema', async () => {
  const person = parse(PersonType, {
    _id: 'carl',
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

  const personCountry = await loadReference(person.country)
  expect(fetch.mock.calls).toEqual([['usa', []]])
  expect(personCountry).toEqual({
    _type: 'country',
    _id: 'usa',
    name: 'USA',
  })

  type LoadedCountry = StoredDocument<Parsed<typeof Country>>

  expectTypeOf(personCountry).toEqualTypeOf<LoadedCountry>()
})

test('resolving a reference without schema falls back to the document base', async () => {
  const person: Infer<typeof PersonType> = {
    _type: 'person',
    firstName: 'Carl',
    lastName: 'Sagan',
    country: {_type: 'reference', _ref: 'usa'},
  }
  const fetch = vi.fn().mockResolvedValueOnce({
    _type: 'country',
    _id: 'usa',
    name: 'USA',
  })
  const loadReference = createReferenceLoader(fetch)

  const personCountry = await loadReference(person.country)
  // parsed against the document base, so only the system fields survive
  expect(personCountry).toEqual({_type: 'country', _id: 'usa'})

  expectTypeOf(personCountry).toEqualTypeOf<StoredDocument<DocumentLike>>()
  expectTypeOf(personCountry).not.toHaveProperty('name')
})

test('document loader selects the document fields and parses the result', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({
    _type: 'country',
    _id: 'usa',
    name: 'USA',
  })
  const loadDocument = createDocumentLoader(fetch)
  const usa = await loadDocument(Country, 'usa')
  expectTypeOf(usa).toEqualTypeOf<Parsed<typeof Country>>()
  expect(fetch.mock.calls).toEqual([
    ['usa', ['_type', '_id', '_createdAt', '_updatedAt', '_rev', 'name']],
  ])
  expect(usa).toEqual({_type: 'country', _id: 'usa', name: 'USA'})

  fetch.mockResolvedValueOnce({_type: 'country', _id: 'usa'})
  await expect(loadDocument(Country, 'usa')).rejects.toThrow(/name/)
})

test('document loader resolves lazy document schemas', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({_type: 'country', name: 'USA'})
  const loadDocument = createDocumentLoader(fetch)
  const usa = await loadDocument(
    lazy(() => Country),
    'usa',
  )
  expect(fetch.mock.calls[0]?.[1]).toContain('name')
  expect(usa).toEqual({_type: 'country', name: 'USA'})
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

  const fetch = vi.fn().mockResolvedValueOnce({
    _type: 'node',
    _id: 'root',
    name: 'root',
  })
  const loadReference = createReferenceLoader(fetch)
  const child = parse(TreeNode, {
    _type: 'node',
    name: 'child',
    parent: {_type: 'reference', _ref: 'root'},
  })

  const parent = await loadReference(child.parent!)
  expect(parent).toEqual({_type: 'node', _id: 'root', name: 'root'})
  expectTypeOf(parent).toEqualTypeOf<StoredDocument<TreeNode>>()
})
