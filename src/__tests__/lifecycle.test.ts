import {expect, test} from 'vitest'

import {document} from '../creators/document'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {committed, partial} from '../lifecycle'
import {parse, safeParse} from '../parse'
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
  expect(parse(Pet, pet)).toEqual(pet)
  expect(safeParse(Pet, {_type: 'pet'}).status).toBe('fail')
})

test('partial() makes every field but _type optional, recursively', () => {
  const PartialPet = partial(Pet)
  expect(PartialPet.typeName).toBe('document')
  expect(parse(PartialPet, {_type: 'pet'})).toEqual({_type: 'pet'})
  expect(parse(PartialPet, {_type: 'pet', owner: {}})).toEqual({
    _type: 'pet',
    owner: {},
  })
  expect(safeParse(PartialPet, {}).status).toBe('fail')
})

test('committed() requires the system fields', () => {
  const CommittedPet = committed(Pet)
  expect(CommittedPet.typeName).toBe('document')
  expect(
    safeParse(CommittedPet, {_type: 'pet', name: 'Fido', owner: {name: 'Ann'}})
      .status,
  ).toBe('fail')
  const value = {
    _type: 'pet',
    ...committedFields,
    name: 'Fido',
    owner: {name: 'Ann'},
  }
  expect(parse(CommittedPet, value)).toEqual(value)
})

test('committed() still requires the declared fields', () => {
  const result = safeParse(committed(Pet), {_type: 'pet', ...committedFields})
  expect(result.status).toBe('fail')
})

test('committed(partial()) only requires the system fields', () => {
  const CommittedPartialPet = committed(partial(Pet))
  expect(
    parse(CommittedPartialPet, {
      _type: 'pet',
      ...committedFields,
      _id: 'drafts.fido',
    }),
  ).toMatchObject({_id: 'drafts.fido'})
  expect(
    safeParse(CommittedPartialPet, {_type: 'pet', name: 'Fido'}).status,
  ).toBe('fail')
})

test('partial() is deepPartial() restricted to documents', () => {
  expect(partial(Pet)).toEqual(deepPartial(Pet))
})

test('committed() returns a new schema and leaves the input untouched', () => {
  const CommittedPet = committed(Pet)
  expect(CommittedPet).not.toBe(Pet)
  expect(
    parse(Pet, {_type: 'pet', name: 'Fido', owner: {name: 'Ann'}}),
  ).toEqual({_type: 'pet', name: 'Fido', owner: {name: 'Ann'}})
})
