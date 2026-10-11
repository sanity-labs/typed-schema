import {assert, describe, expectTypeOf, test} from 'vitest'

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
  type SanityDocument,
  type SanityObjectType,
  type SanityString,
  type SanityType,
} from '../defs'
import {
  type CheckReferenceTargets,
  type InvalidAnnotations,
  type ReferenceTargetErrors,
} from '../helpers/schemaErrors'
import {type SchemaError} from '../helpers/utilTypes'
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
    const parsedResult = parse(Pet, {})
    assert(parsedResult.ok)
    const parsed = parsedResult.value
    expectTypeOf(parsed.owner.$refSchema).toEqualTypeOf<typeof Person>()
  })

  test('a parsed value is assignable to the inferred type', () => {
    const parsedResult = parse(Pet, {})
    assert(parsedResult.ok)
    const parsed = parsedResult.value
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

describe('references with several targets', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})

  test('the inferred type is plain reference data', () => {
    const Ref = reference([Author, Book])
    expectTypeOf<Infer<typeof Ref>>().toEqualTypeOf<{
      _type: 'reference'
      _ref: string
      _weak?: boolean
    }>()
  })

  test('the parsed type includes every target schema', () => {
    const Ref = reference([Author, Book])
    expectTypeOf<Parsed<typeof Ref>['$refSchema']>().toEqualTypeOf<
      readonly [typeof Author, typeof Book]
    >()
  })

  test('lazy targets and targets typed by their value are accepted', () => {
    interface Person extends SanityDocumentValue {
      name: string
    }
    const Person: SanityType<Person> = document({
      _type: literal('person'),
      name: string(),
    })
    reference([lazy(() => Author), Person, lazy(() => Person)])
  })

  test('a document can reference itself and others through a getter', () => {
    const Person = document({
      _type: literal('person'),
      name: string(),
      get favorite() {
        return reference([lazy(() => Person), Book])
      },
    })
    type FavoriteSchemas = Parsed<typeof Person>['favorite']['$refSchema']
    expectTypeOf<Infer<FavoriteSchemas[0]>['name']>().toEqualTypeOf<string>()
  })

  test('annotations are typed against the reference value', () => {
    reference([Author, Book], {
      title: 'Subject',
      examples: [{_type: 'reference', _ref: 'cosmos'}],
    })
    // @ts-expect-error - examples must be reference values
    reference([Author, Book], {examples: ['cosmos']})
  })

  test('targets that are not documents are rejected', () => {
    reference([
      Author,
      // @ts-expect-error - a typed object is not a document
      object({_type: literal('x'), title: string()}),
    ])
    // @ts-expect-error - a primitive is not a document
    reference([Author, string()])
    // @ts-expect-error - no targets
    reference([])
  })

  test('invalid targets report why', () => {
    expectTypeOf<
      CheckReferenceTargets<[SanityDocument, SanityString]>
    >().toEqualTypeOf<
      [
        SanityDocument,
        SanityString &
          SchemaError<'reference() targets must be document schemas'>,
      ]
    >()
    expectTypeOf<CheckReferenceTargets<[]>>().toEqualTypeOf<
      SchemaError<'reference() needs at least one target document schema'>
    >()
    expectTypeOf<
      ReferenceTargetErrors<[SanityDocument, SanityDocument]>
    >().toEqualTypeOf<SchemaError<InvalidAnnotations<'reference'>>>()
  })
})
