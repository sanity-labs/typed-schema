import {expectTypeOf, test} from 'vitest'

import {array} from '../creators/array'
import {boolean} from '../creators/boolean'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {never} from '../creators/never'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {
  type Infer,
  type SanityDocument,
  type SanityDocumentUnion,
  type SanityLazy,
  type SanityNever,
  type SanityNumber,
  type SanityObject,
  type SanityObjectUnion,
  type SanityOptional,
  type SanityReference,
  type SanityString,
  type SanityDocumentType,
  type SanityType,
  type SanityTypedObject,
} from '../defs'
import {
  type ArrayElementError,
  type CheckUnionMembers,
} from '../helpers/schemaErrors'
import {type ElementType, type SchemaError} from '../helpers/utilTypes'
import {type SanityDocumentValue} from '../shapeDefs'

test('primitive unions', () => {
  union([string(), union([number(), boolean()])])
  union([string(), union([number(), never()])])
})
test('union of objects without _type', () => {
  union([
    //@ts-expect-error - missing _type
    object({foo: string()}),
  ])
})

test('object union of object union', () => {
  union([
    object({_type: literal('foo'), foo: string()}),
    object({_type: literal('bar'), foo: string()}),
    union([object({_type: literal('baz'), foo: string()})]),
    union([object({_type: literal('baz'), foo: string()}), never()]),
  ])
})

test('union type excludes never type', () => {
  expectTypeOf<ElementType<SanityObjectUnion['union']>>()
    .extract<SanityNever>()
    .toEqualTypeOf<never>()
})

test('union members that break a rule are rejected', () => {
  const Link = object({_type: literal('link'), href: string()})
  const Untyped = object({href: string()})

  // On one line: TypeScript 7 reports the error at Link, TypeScript 6 at the call
  // @ts-expect-error - a union cannot mix primitives and objects
  union([string(), Link])
  union([
    Link,
    // @ts-expect-error - object union members need a _type literal
    Untyped,
  ])
})

test('union members that break a rule report why', () => {
  type Link = SanityObject<{
    _type: ReturnType<typeof literal<'link'>>
    href: SanityString
  }>
  type Untyped = SanityObject<{href: SanityString}>

  expectTypeOf<
    CheckUnionMembers<[SanityString, Link, SanityNumber, Link]>
  >().toEqualTypeOf<
    [
      SanityString,
      Link &
        SchemaError<'union() members cannot mix primitive types and object types'>,
      SanityNumber,
      Link,
    ]
  >()
  expectTypeOf<CheckUnionMembers<(SanityString | Link)[]>>().toEqualTypeOf<
    SchemaError<'union() members cannot mix primitive types and object types'>
  >()
  expectTypeOf<CheckUnionMembers<[Link, Untyped]>>().toEqualTypeOf<
    [
      Link,
      Untyped &
        SchemaError<"union() members that are objects need a _type literal field, e.g. _type: literal('link')">,
    ]
  >()
  expectTypeOf<CheckUnionMembers<[SanityString, SanityNumber]>>().toEqualTypeOf<
    [SanityString, SanityNumber]
  >()
})

test('documents and lazy documents can be union members', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Docs = union([Author, lazy(() => Book)])
  expectTypeOf<Infer<typeof Docs>>().toEqualTypeOf<
    Infer<typeof Author> | Infer<typeof Book>
  >()
  union([
    Author,
    // @ts-expect-error - only lazy documents can be union members
    lazy(() => object({_type: literal('link'), href: string()})),
  ])
})

test('a union of many members compiles', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const typed = <const Name extends string>(name: Name) =>
    object({_type: literal(name)})
  const Many = union([
    typed('t0'),
    typed('t1'),
    typed('t2'),
    typed('t3'),
    typed('t4'),
    typed('t5'),
    typed('t6'),
    typed('t7'),
    typed('t8'),
    typed('t9'),
    typed('t10'),
    typed('t11'),
    typed('t12'),
    typed('t13'),
    typed('t14'),
    typed('t15'),
    typed('t16'),
    typed('t17'),
    typed('t18'),
    typed('t19'),
    typed('t20'),
    typed('t21'),
    typed('t22'),
    typed('t23'),
    typed('t24'),
    typed('t25'),
    typed('t26'),
    typed('t27'),
    typed('t28'),
    typed('t29'),
    typed('t30'),
    typed('t31'),
    typed('t32'),
    typed('t33'),
    typed('t34'),
    typed('t35'),
    typed('t36'),
    typed('t37'),
    typed('t38'),
    typed('t39'),
    typed('t40'),
    typed('t41'),
    typed('t42'),
    typed('t43'),
    typed('t44'),
    typed('t45'),
    typed('t46'),
    typed('t47'),
    typed('t48'),
    typed('t49'),
    typed('t50'),
    typed('t51'),
    typed('t52'),
    typed('t53'),
    typed('t54'),
    typed('t55'),
    typed('t56'),
    typed('t57'),
    typed('t58'),
    typed('t59'),
    reference(Author),
    reference(Book),
  ])
  expectTypeOf<
    Extract<Infer<typeof Many>['_type'], 't0' | 't59'>
  >().toEqualTypeOf<'t0' | 't59'>()
  // the two references at the end are merged
  expectTypeOf<
    Extract<(typeof Many.union)[number], {typeName: 'reference'}>
  >().toEqualTypeOf<
    SanityReference<SanityDocumentUnion<typeof Author | typeof Book>>
  >()
})

test('union members that are not object-like or primitive report why', () => {
  type Link = SanityObject<{
    _type: ReturnType<typeof literal<'link'>>
    href: SanityString
  }>
  expectTypeOf<
    CheckUnionMembers<[SanityDocument, SanityDocument]>
  >().toEqualTypeOf<[SanityDocument, SanityDocument]>()
  expectTypeOf<CheckUnionMembers<[SanityDocument, Link]>>().toEqualTypeOf<
    [
      SanityDocument,
      Link &
        SchemaError<'union() members cannot mix documents and other object types'>,
    ]
  >()
  expectTypeOf<
    CheckUnionMembers<[SanityDocument, SanityString]>
  >().toEqualTypeOf<
    [
      SanityDocument,
      SanityString &
        SchemaError<'union() members cannot mix primitive types and object types'>,
    ]
  >()
  expectTypeOf<CheckUnionMembers<[SanityLazy<Link>]>>().toEqualTypeOf<
    [
      SanityLazy<Link> &
        SchemaError<'union() members that are lazy() must be documents'>,
    ]
  >()
  expectTypeOf<CheckUnionMembers<SanityReference[]>>().toEqualTypeOf<
    SchemaError<'union() members that include a reference() must be an array literal, e.g. union([reference(Author), Link]), not a variable typed as an array'>
  >()
  expectTypeOf<CheckUnionMembers<[Link, SanityOptional<Link>]>>().toEqualTypeOf<
    [
      Link,
      SanityOptional<Link> &
        SchemaError<'union() members must be primitives, literals, typed objects, documents, references, blocks, images or files'>,
    ]
  >()
})

test('a union of documents is a document union', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Magazine = document({_type: literal('magazine'), title: string()})
  expectTypeOf(union([Author, Book])).toEqualTypeOf<
    SanityDocumentUnion<typeof Author | typeof Book>
  >()
  // nested document unions are flattened
  expectTypeOf(union([Author, union([Book, Magazine])])).toEqualTypeOf<
    SanityDocumentUnion<typeof Author | typeof Book | typeof Magazine>
  >()
})

test('a union of documents can include documents typed as SanityDocumentType', () => {
  interface Person extends SanityDocumentValue {
    name: string
  }
  const Person: SanityDocumentType<Person> = document({
    _type: literal('person'),
    name: string(),
  })
  const Book = document({_type: literal('book'), title: string()})
  expectTypeOf(union([Person, Book])).toEqualTypeOf<
    SanityDocumentUnion<typeof Person | typeof Book>
  >()
  expectTypeOf(union([lazy(() => Person), Book])).toEqualTypeOf<
    SanityDocumentUnion<SanityLazy<typeof Person> | typeof Book>
  >()
})

test('a schema typed as SanityType<Value> cannot be a union member', () => {
  interface Person extends SanityDocumentValue {
    name: string
  }
  // may be an object at runtime: the type does not say
  const Person: SanityType<Person> = document({
    _type: literal('person'),
    name: string(),
  })
  const Book = document({_type: literal('book'), title: string()})
  union([
    // @ts-expect-error - typed as SanityType<Value>
    Person,
    Book,
  ])
  expectTypeOf<CheckUnionMembers<[typeof Person, typeof Book]>>().toEqualTypeOf<
    [
      typeof Person &
        SchemaError<'union() members typed by their value must be typed as SanityDocumentType<Value> or SanityObjectType<Value>, not SanityType<Value>'>,
      typeof Book,
    ]
  >()
})

test('generic code can build a union without references', () => {
  function unionOf<T extends SanityTypedObject>(members: T[]) {
    return union(members)
  }
  const Link = object({_type: literal('link'), href: string()})
  expectTypeOf(unionOf([Link])).toEqualTypeOf<SanityObjectUnion<typeof Link>>()
})

test('array() rejects a union of documents', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  // @ts-expect-error - use array(reference(union([...]))) for references
  array(union([Author, Book]))
  expectTypeOf<
    ArrayElementError<SanityDocumentUnion<typeof Author>>
  >().toEqualTypeOf<'array() elements cannot be a union() of documents. For references to several document types, use array(reference(union([...])))'>()
})

test('documents cannot be mixed with other object types', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Link = object({_type: literal('link'), href: string()})
  union([
    Author,
    // @ts-expect-error - a document and a typed object
    Link,
  ])
})

test('members that include a reference() must be an array literal', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const members = [reference(Author), reference(Book)]
  // @ts-expect-error - the references cannot be counted
  union(members)
  const tuple = [reference(Author), reference(Book)] as const
  expectTypeOf(union(tuple)).toEqualTypeOf<
    SanityObjectUnion<
      SanityReference<SanityDocumentUnion<typeof Author | typeof Book>>
    >
  >()
})
