import {expect, test} from 'vitest'

import {document} from '../creators/document'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {committed, partial} from '../lifecycle'
import {parse} from '../parse'
import {deepPartial} from '../utils/deepPartial'

const Pet = document({
  _type: literal('pet'),
  name: string(),
  owner: object({name: string()}),
})

const committedFields = {
  _id: 'fido',
  _rev: 'r1',
  _createdAt: '2023-12-06T19:01:07Z',
  _updatedAt: '2023-12-06T19:01:07Z',
}

test('the base schema accepts a complete document without system fields', () => {
  const pet = {_type: 'pet', name: 'Fido', owner: {name: 'Ann'}}
  expect(parse(Pet, pet)).toEqual({ok: true, value: pet})
  expect(parse(Pet, {_type: 'pet'}).ok).toBe(false)
})

test('partial() makes every field but _type optional, recursively', () => {
  const PartialPet = partial(Pet)
  expect(PartialPet.typeName).toBe('document')
  expect(parse(PartialPet, {_type: 'pet'})).toEqual({
    ok: true,
    value: {_type: 'pet'},
  })
  expect(parse(PartialPet, {_type: 'pet', owner: {}})).toEqual({
    ok: true,
    value: {
      _type: 'pet',
      owner: {},
    },
  })
  expect(parse(PartialPet, {}).ok).toBe(false)
})

test('committed() requires the system fields', () => {
  const CommittedPet = committed(Pet)
  expect(CommittedPet.typeName).toBe('document')
  expect(
    parse(CommittedPet, {_type: 'pet', name: 'Fido', owner: {name: 'Ann'}}).ok,
  ).toBe(false)
  const value = {
    _type: 'pet',
    ...committedFields,
    name: 'Fido',
    owner: {name: 'Ann'},
  }
  expect(parse(CommittedPet, value)).toEqual({ok: true, value})
})

test('committed() still requires the declared fields', () => {
  const result = parse(committed(Pet), {_type: 'pet', ...committedFields})
  expect(result.ok).toBe(false)
})

test('committed(partial()) only requires the system fields', () => {
  const CommittedPartialPet = committed(partial(Pet))
  expect(
    parse(CommittedPartialPet, {
      _type: 'pet',
      ...committedFields,
      _id: 'drafts.fido',
    }),
  ).toMatchObject({ok: true, value: {_id: 'drafts.fido'}})
  expect(parse(CommittedPartialPet, {_type: 'pet', name: 'Fido'}).ok).toBe(
    false,
  )
})

test('partial() is deepPartial() restricted to documents', () => {
  expect(partial(Pet)).toEqual(deepPartial(Pet))
})

test('committed() returns a new schema and leaves the input untouched', () => {
  const CommittedPet = committed(Pet)
  expect(CommittedPet).not.toBe(Pet)
  expect(
    parse(Pet, {_type: 'pet', name: 'Fido', owner: {name: 'Ann'}}),
  ).toEqual({
    ok: true,
    value: {_type: 'pet', name: 'Fido', owner: {name: 'Ann'}},
  })
})
