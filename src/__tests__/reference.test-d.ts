import {assert, describe, expectTypeOf, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {
  type DocumentSchema,
  type DocumentSchemaOf,
  type DocumentUnionSchema,
  type Infer,
  type ObjectSchemaOf,
  type ObjectUnionSchema,
  type Parsed,
  type Schema,
} from '../defs'
import {
  type InvalidAnnotations,
  type ReferenceTargetError,
} from '../helpers/schemaErrors'
import {parse} from '../parse'
import {type DocumentValue} from '../shapeDefs'

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
    interface Person extends DocumentValue {
      name: string
    }
    const Person: Schema<Person> = document({
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
    interface Person extends DocumentValue {
      name: string
    }
    const Person: Schema<Person> = document({
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
    reference({} as ObjectSchemaOf<{_type: 'x'}>)
    // @ts-expect-error - a primitive is not a document
    reference(string())
    // @ts-expect-error - a primitive is not a document
    reference(number())
  })
})

describe('references to several document types', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Link = object({_type: literal('link'), href: string()})

  test('the inferred type is plain reference data', () => {
    const Ref = reference(union([Author, Book]))
    expectTypeOf<Infer<typeof Ref>>().toEqualTypeOf<{
      _type: 'reference'
      _ref: string
      _weak?: boolean
    }>()
  })

  test('the parsed type includes the union of targets', () => {
    const Ref = reference(union([Author, Book]))
    expectTypeOf<Parsed<typeof Ref>['$refSchema']>().toEqualTypeOf<
      DocumentUnionSchema<typeof Author | typeof Book>
    >()
  })

  test('a union of references is a reference to a union', () => {
    const Ref = reference(union([Author, Book]))
    expectTypeOf(union([reference(Author), reference(Book)])).toEqualTypeOf<
      ObjectUnionSchema<typeof Ref>
    >()
    expectTypeOf(
      union([reference(Author), Link, union([reference(Book), Link])]),
    ).toEqualTypeOf<ObjectUnionSchema<typeof Ref | typeof Link>>()
    expectTypeOf(
      union([reference(union([Author, Book])), reference(Author)]),
    ).toEqualTypeOf<ObjectUnionSchema<typeof Ref>>()
  })

  test('a union with one reference keeps it', () => {
    const AuthorRef = reference(Author)
    expectTypeOf(union([AuthorRef, Link])).toEqualTypeOf<
      ObjectUnionSchema<typeof AuthorRef | typeof Link>
    >()
  })

  test('a target typed by its value becomes a document type in the merged union', () => {
    interface Person extends DocumentValue {
      name: string
    }
    const Person: Schema<Person> = document({
      _type: literal('person'),
      name: string(),
    })
    const Merged = union([reference(Person), reference(Book)])
    expectTypeOf<Parsed<typeof Merged>['$refSchema']>().toEqualTypeOf<
      DocumentUnionSchema<DocumentSchemaOf<Person> | typeof Book>
    >()
  })

  test('lazy documents can be targets', () => {
    const Ref = reference(union([lazy(() => Author), Book]))
    expectTypeOf<Infer<typeof Ref>['_ref']>().toEqualTypeOf<string>()
  })

  test('a document can reference itself and others through a getter', () => {
    const Person = document({
      _type: literal('person'),
      name: string(),
      get favorite() {
        return reference(union([lazy(() => Person), Book]))
      },
      get friends() {
        return array(union([reference(lazy(() => Person)), reference(Book)]))
      },
    })
    type Favorite = Parsed<typeof Person>['favorite']['$refSchema']
    expectTypeOf<Infer<Favorite>>().toEqualTypeOf<
      Infer<typeof Person> | Infer<typeof Book>
    >()
    type Friend = Parsed<typeof Person>['friends'][number]['$refSchema']
    expectTypeOf<Infer<Friend>>().toEqualTypeOf<
      Infer<typeof Person> | Infer<typeof Book>
    >()
  })

  test('annotations are typed against the reference value', () => {
    reference(union([Author, Book]), {
      title: 'Subject',
      examples: [{_type: 'reference', _ref: 'cosmos'}],
    })
    // @ts-expect-error - examples must be reference values
    reference(union([Author, Book]), {examples: ['cosmos']})
  })

  test('a union with members that are not documents is rejected', () => {
    // @ts-expect-error - a typed object is not a document
    reference(union([Author, Link]))
    expectTypeOf<
      ReferenceTargetError<ObjectUnionSchema<typeof Link>>
    >().toEqualTypeOf<'reference() target must be a document schema or a union() of document schemas'>()
    expectTypeOf<
      ReferenceTargetError<DocumentUnionSchema<DocumentSchema>>
    >().toEqualTypeOf<InvalidAnnotations<'reference'>>()
  })
})

test('a reference to a union of documents typed by their value equals the union of references', () => {
  interface Person extends DocumentValue {
    name: string
  }
  const Person: DocumentSchemaOf<Person> = document({
    _type: literal('person'),
    name: string(),
  })
  const Book = document({_type: literal('book'), title: string()})
  const Ref = reference(union([Person, Book]))
  expectTypeOf(union([reference(Person), reference(Book)])).toEqualTypeOf<
    ObjectUnionSchema<typeof Ref>
  >()
})
