import {expectTypeOf, test} from 'vitest'

import {boolean} from '../creators/boolean'
import {document} from '../creators/document'
import {literal} from '../creators/literal'
import {never} from '../creators/never'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {
  type Infer,
  type SanityNever,
  type SanityNumber,
  type SanityObject,
  type SanityObjectUnion,
  type SanityReference,
  type SanityString,
} from '../defs'
import {type CheckUnionMembers} from '../helpers/schemaErrors'
import {type ElementType, type SchemaError} from '../helpers/utilTypes'

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

const MultipleReferences =
  'union() can have only one reference() member. Use one reference() with several targets instead, e.g. reference([Author, Book])' as const

test('a union can have only one reference', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Link = object({_type: literal('link'), href: string()})

  union([reference(Author), Link])
  union([Link, union([reference(Author), never()])])
  union([
    reference(Author),
    // @ts-expect-error - a second reference
    reference(Book),
  ])
  union([
    reference(Author),
    Link,
    // @ts-expect-error - the same target twice is still a second reference
    reference(Author),
  ])
  union([
    reference(Author),
    // @ts-expect-error - a nested union with a reference
    union([reference(Book), Link]),
  ])
  union([
    union([reference(Author)]),
    // @ts-expect-error - two nested unions with a reference each
    union([reference(Book)]),
  ])
})

test('a second reference reports why', () => {
  type Author = ReturnType<
    typeof document<{
      _type: ReturnType<typeof literal<'author'>>
      name: SanityString
    }>
  >
  type Book = ReturnType<
    typeof document<{
      _type: ReturnType<typeof literal<'book'>>
      title: SanityString
    }>
  >
  type Link = SanityObject<{
    _type: ReturnType<typeof literal<'link'>>
    href: SanityString
  }>
  type AuthorRef = SanityReference<Author>
  type BookRef = SanityReference<Book>

  expectTypeOf<
    CheckUnionMembers<[AuthorRef, Link, BookRef, AuthorRef]>
  >().toEqualTypeOf<
    [
      AuthorRef,
      Link,
      BookRef & SchemaError<typeof MultipleReferences>,
      AuthorRef,
    ]
  >()
  expectTypeOf<
    CheckUnionMembers<[SanityObjectUnion<AuthorRef | Link>, BookRef]>
  >().toEqualTypeOf<
    [
      SanityObjectUnion<AuthorRef | Link>,
      BookRef & SchemaError<typeof MultipleReferences>,
    ]
  >()
  expectTypeOf<CheckUnionMembers<[AuthorRef, Link]>>().toEqualTypeOf<
    [AuthorRef, Link]
  >()
})

test('a union of many members compiles', () => {
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
  ])
  expectTypeOf<
    Extract<Infer<typeof Many>['_type'], 't0' | 't59'>
  >().toEqualTypeOf<'t0' | 't59'>()
})
