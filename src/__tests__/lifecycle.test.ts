import {expect, test} from 'vitest'

import {document} from '../creators/document'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {draft, stored} from '../lifecycle'
import {parse, safeParse} from '../parse'

const Pet = document({
  _type: literal('pet'),
  name: string(),
  owner: object({name: string()}),
})

test('draft() makes every field but _type optional, recursively', () => {
  const PetDraft = draft(Pet)
  expect(PetDraft.typeName).toBe('document')
  expect(parse(PetDraft, {_type: 'pet'})).toEqual({_type: 'pet'})
  expect(parse(PetDraft, {_type: 'pet', owner: {}})).toEqual({
    _type: 'pet',
    owner: {},
  })
  expect(safeParse(PetDraft, {}).status).toBe('fail')
})

test('stored() requires the system fields', () => {
  const StoredPet = stored(Pet)
  expect(
    safeParse(StoredPet, {_type: 'pet', name: 'Fido', owner: {name: 'Ann'}})
      .status,
  ).toBe('fail')
  const value = {
    _type: 'pet',
    _id: 'fido',
    _rev: 'r1',
    _createdAt: '2023-12-06T19:01:07Z',
    _updatedAt: '2023-12-06T19:01:07Z',
    name: 'Fido',
    owner: {name: 'Ann'},
  }
  expect(parse(StoredPet, value)).toEqual(value)
})

test('stored(draft()) only requires the system fields', () => {
  const StoredDraft = stored(draft(Pet))
  expect(
    parse(StoredDraft, {
      _type: 'pet',
      _id: 'drafts.fido',
      _rev: 'r1',
      _createdAt: '2023-12-06T19:01:07Z',
      _updatedAt: '2023-12-06T19:01:07Z',
    }),
  ).toMatchObject({_id: 'drafts.fido'})
})
