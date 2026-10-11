import {expectTypeOf, test} from 'vitest'

import {boolean} from '../creators/boolean'
import {literal} from '../creators/literal'
import {never} from '../creators/never'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {
  type SanityNever,
  type SanityNumber,
  type SanityObject,
  type SanityObjectUnion,
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
