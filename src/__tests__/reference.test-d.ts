import {describe, expectTypeOf, test} from 'vitest'

import {document} from '../creators/document'
import {literal} from '../creators/literal'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {type Infer, type Parsed} from '../defs'
import {parse} from '../parse'

describe('reference type', () => {
  const Person = document({_type: literal('person'), name: string()})
  const Pet = document({
    _type: literal('pet'),
    name: string(),
    owner: reference(Person),
  })

  test('the inferred type is plain reference data', () => {
    expectTypeOf<Infer<typeof Pet>['owner']>().toEqualTypeOf<{
      _type: 'reference'
      _ref: string
      _weak?: boolean
    }>()
  })

  test('the referenced schema is visible on the parsed type', () => {
    expectTypeOf<Parsed<typeof Pet>['owner']>().toEqualTypeOf<{
      _type: 'reference'
      _ref: string
      _weak?: boolean
      $refSchema: typeof Person
    }>()
  })

  test('hand-written reference values are assignable without $refSchema', () => {
    const value: Infer<typeof Pet> = {
      _type: 'pet',
      name: 'Jara',
      owner: {_type: 'reference', _ref: 'knut'},
    }
    expectTypeOf(value.owner).not.toHaveProperty('$refSchema')
  })

  test('parsed values include the referenced schema', () => {
    const parsed = parse(Pet, {})
    expectTypeOf(parsed.owner.$refSchema).toEqualTypeOf<typeof Person>()
  })

  test('a parsed value is assignable to the inferred type', () => {
    const parsed = parse(Pet, {})
    const value: Infer<typeof Pet> = parsed
    expectTypeOf(value).toEqualTypeOf<Infer<typeof Pet>>()
  })
})
