import {expect, expectTypeOf, test, vi} from 'vitest'

import {document} from '../../creators/document'
import {lazy} from '../../creators/lazy'
import {literal} from '../../creators/literal'
import {reference} from '../../creators/reference'
import {string} from '../../creators/string'
import {type Infer} from '../../defs'
import {type StoredDocument} from '../../lifecycle'
import {parse} from '../../parse'
import {createDocumentLoader} from '../createDocumentLoader'
import {createReferenceLoader} from '../createReferenceLoader'

const country = document({
  _type: literal('country'),
  name: string(),
})

const personType = document({
  _type: literal('person'),
  firstName: string(),
  lastName: string(),
  country: reference(country),
})

test('resolve reference with schema', async () => {
  const person = parse(personType, {
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

  type LoadedCountry = StoredDocument<Infer<typeof country>>

  expectTypeOf(personCountry).toEqualTypeOf<LoadedCountry>()
})

test('document loader selects the document fields and parses the result', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({
    _type: 'country',
    _id: 'usa',
    name: 'USA',
  })
  const loadDocument = createDocumentLoader(fetch)
  const usa = await loadDocument(country, 'usa')
  expect(fetch.mock.calls).toEqual([
    ['usa', ['_type', '_id', '_createdAt', '_updatedAt', '_rev', 'name']],
  ])
  expect(usa).toEqual({_type: 'country', _id: 'usa', name: 'USA'})

  fetch.mockResolvedValueOnce({_type: 'country', _id: 'usa'})
  await expect(loadDocument(country, 'usa')).rejects.toThrow(/name/)
})

test('document loader resolves lazy document schemas', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({_type: 'country', name: 'USA'})
  const loadDocument = createDocumentLoader(fetch)
  const usa = await loadDocument(
    lazy(() => country),
    'usa',
  )
  expect(fetch.mock.calls[0]?.[1]).toContain('name')
  expect(usa).toEqual({_type: 'country', name: 'USA'})
})
