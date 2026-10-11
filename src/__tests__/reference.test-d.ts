import {describe, expectTypeOf, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {
  type Infer,
  type Parsed,
  type SanityObjectType,
  type SanityType,
} from '../defs'
import {parse} from '../parse'
import {type SanityDocumentValue} from '../shapeDefs'

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

describe('reference targets', () => {
  test('a document annotated by its value can be referenced', () => {
    interface Person extends SanityDocumentValue {
      name: string
    }
    const Person: SanityType<Person> = document({
      _type: literal('person'),
      name: string(),
    })
    const Ref = reference(Person)
    expectTypeOf<Parsed<typeof Ref>['$refSchema']>().toEqualTypeOf<
      typeof Person
    >()
  })

  test('a lazy document can be referenced', () => {
    const Person = document({_type: literal('person'), name: string()})
    const Ref = reference(lazy(() => Person))
    expectTypeOf<Infer<typeof Ref>['_ref']>().toEqualTypeOf<string>()
  })

  test('a lazy document annotated by its value can be referenced', () => {
    interface Person extends SanityDocumentValue {
      name: string
    }
    const Person: SanityType<Person> = document({
      _type: literal('person'),
      name: string(),
    })
    const Ref = reference(lazy(() => Person))
    expectTypeOf<Infer<typeof Ref>['_ref']>().toEqualTypeOf<string>()
  })

  test('a document can reference itself lazily through a getter', () => {
    const Person = document({
      _type: literal('person'),
      name: string(),
      get friends() {
        return array(reference(lazy(() => Person)))
      },
    })
    type FriendSchema = Parsed<typeof Person>['friends'][number]['$refSchema']
    expectTypeOf<Infer<FriendSchema>['name']>().toEqualTypeOf<string>()
  })

  test('non-document schemas are rejected', () => {
    // @ts-expect-error - a typed object is not a document
    reference(object({_type: literal('x'), title: string()}))
    // @ts-expect-error - an untyped object is not a document
    reference(object({title: string()}))
    // @ts-expect-error - a lazy typed object is not a document
    reference(lazy(() => object({_type: literal('x'), title: string()})))
    // @ts-expect-error - a schema annotated as an object is not a document
    reference({} as SanityObjectType<{_type: 'x'}>)
    // @ts-expect-error - a primitive is not a document
    reference(string())
    // @ts-expect-error - a primitive is not a document
    reference(number())
  })
})
