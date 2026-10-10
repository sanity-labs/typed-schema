import {expect, test} from 'vitest'

import {document} from '../creators/document'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {draft, stored} from '../lifecycle'
import {parse, safeParse} from '../parse'

const pet = document({
  _type: literal('pet'),
  name: string(),
  owner: object({name: string()}),
})

test('draft() makes every field but _type optional, recursively', () => {
  const petDraft = draft(pet)
  expect(petDraft.typeName).toBe('document')
  expect(parse(petDraft, {_type: 'pet'})).toEqual({_type: 'pet'})
  expect(parse(petDraft, {_type: 'pet', owner: {}})).toEqual({
    _type: 'pet',
    owner: {},
  })
  expect(safeParse(petDraft, {}).status).toBe('fail')
})

test('stored() requires the system fields', () => {
  const storedPet = stored(pet)
  expect(
    safeParse(storedPet, {_type: 'pet', name: 'Fido', owner: {name: 'Ann'}})
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
  expect(parse(storedPet, value)).toEqual(value)
})

test('stored(draft()) only requires the system fields', () => {
  const storedDraft = stored(draft(pet))
  expect(
    parse(storedDraft, {
      _type: 'pet',
      _id: 'drafts.fido',
      _rev: 'r1',
      _createdAt: '2023-12-06T19:01:07Z',
      _updatedAt: '2023-12-06T19:01:07Z',
    }),
  ).toMatchObject({_id: 'drafts.fido'})
})
