import {assert, describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {REF_SCHEMA} from '../defs'
import {parse} from '../parse'

const Person = document({_type: literal('person'), name: string()})

describe('parse attaches the referenced schema at every depth', () => {
  test('nested object', () => {
    const Pet = document({
      _type: literal('pet'),
      details: object({owner: reference(Person)}),
    })
    const petResult = parse(Pet, {
      _type: 'pet',
      details: {owner: {_type: 'reference', _ref: 'knut'}},
    })
    assert(petResult.ok)
    const pet = petResult.value
    expect(pet.details.owner[REF_SCHEMA]).toBe(Person)
    expect(Object.keys(pet.details.owner)).not.toContain(REF_SCHEMA)
  })

  test('array item', () => {
    const Owners = array(reference(Person))
    const ownersResult = parse(Owners, [
      {_key: 'a', _type: 'reference', _ref: 'knut'},
    ])
    assert(ownersResult.ok)
    const owners = ownersResult.value
    expect(owners[0]?.[REF_SCHEMA]).toBe(Person)
  })

  test('union member', () => {
    const Link = object({_type: literal('link'), href: string()})
    const Either = union([Link, reference(Person)])
    const eitherResult = parse(Either, {_type: 'reference', _ref: 'knut'})
    assert(eitherResult.ok)
    const either = eitherResult.value
    assert(either._type === 'reference')
    expect(either[REF_SCHEMA]).toBe(Person)
  })

  test('several targets', () => {
    const Company = document({_type: literal('company'), name: string()})
    const Owner = reference([Person, Company])
    const ownerResult = parse(Owner, {_type: 'reference', _ref: 'acme'})
    assert(ownerResult.ok)
    expect(ownerResult.value[REF_SCHEMA]).toEqual([Person, Company])
    expect(Object.keys(ownerResult.value)).not.toContain(REF_SCHEMA)
  })

  test('optional', () => {
    const Pet = object({owner: optional(reference(Person))})
    const without = parse(Pet, {})
    assert(without.ok)
    expect(without.value.owner).toBeUndefined()
    const withOwner = parse(Pet, {owner: {_type: 'reference', _ref: 'knut'}})
    assert(withOwner.ok)
    expect(withOwner.value.owner?.[REF_SCHEMA]).toBe(Person)
  })

  test('lazy', () => {
    const Pet = object({owner: lazy(() => reference(Person))})
    const petResult = parse(Pet, {owner: {_type: 'reference', _ref: 'knut'}})
    assert(petResult.ok)
    const pet = petResult.value
    expect(pet.owner[REF_SCHEMA]).toBe(Person)
  })
})
