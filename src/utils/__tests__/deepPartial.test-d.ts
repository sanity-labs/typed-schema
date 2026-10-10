import {assertType, expectTypeOf, test} from 'vitest'

import {lazy} from '../../creators/lazy'
import {literal} from '../../creators/literal'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {string} from '../../creators/string'
import {
  type Infer,
  type SanityBoolean,
  type SanityDocument,
  type SanityLiteral,
  type SanityNumber,
  type SanityObject,
  type SanityObjectArray,
  type SanityObjectType,
  type SanityObjectUnion,
  type SanityOptional,
  type SanityString,
} from '../../defs'
import {parse} from '../../parse'
import {type DeepPartial, deepPartial} from '../deepPartial'
import {extend} from '../extend'
import {omit} from '../omit'

test('deep partial on primitive types', () => {
  expectTypeOf<DeepPartial<SanityString>>().toEqualTypeOf<SanityString>()
  expectTypeOf<DeepPartial<SanityBoolean>>().toEqualTypeOf<SanityBoolean>()
  expectTypeOf<DeepPartial<SanityNumber>>().toEqualTypeOf<SanityNumber>()
})

test('deep partial on shallow object type', () => {
  type Obj = SanityObject<{foo: SanityString}>
  expectTypeOf<DeepPartial<Obj>>().toEqualTypeOf<
    SanityObject<{foo: SanityOptional<SanityString>}>
  >()
})

test('deep partial on shallow document type', () => {
  type Doc = SanityDocument<{
    _type: SanityLiteral<'test'> // _type can never be optional
    _id: SanityOptional<SanityString>
    _createdAt: SanityOptional<SanityString>
    _updatedAt: SanityOptional<SanityString>
    _rev: SanityOptional<SanityString>
    foo: SanityString
  }>
  expectTypeOf<DeepPartial<Doc>>().toEqualTypeOf<
    SanityDocument<{
      _type: SanityLiteral<'test'> // _type can never be optional
      _id: SanityOptional<SanityString>
      _createdAt: SanityOptional<SanityString>
      _updatedAt: SanityOptional<SanityString>
      _rev: SanityOptional<SanityString>
      foo: SanityOptional<SanityString>
    }>
  >()
})

test('deep partial on union types', () => {
  type Union = SanityObjectUnion<
    | SanityObject<{_type: SanityLiteral<'a'>; str: SanityString}>
    | SanityObject<{_type: SanityLiteral<'b'>; num: SanityNumber}>
  >

  expectTypeOf<DeepPartial<Union>>().toEqualTypeOf<
    SanityObjectUnion<
      | SanityObject<{
          _type: SanityLiteral<'a'>
          str: SanityOptional<SanityString>
        }>
      | SanityObject<{
          _type: SanityLiteral<'b'>
          num: SanityOptional<SanityNumber>
        }>
    >
  >()
})

test('deep partial on literal types', () => {
  type Obj = SanityObject<{foo: SanityLiteral<'bar'>}>
  expectTypeOf<DeepPartial<Obj>>().toEqualTypeOf<
    SanityObject<{foo: SanityOptional<SanityLiteral<'bar'>>}>
  >()
})

test('deep partial on object array type', () => {
  type Arr = SanityObjectArray<SanityObject<{str: SanityString}>>

  expectTypeOf<DeepPartial<Arr>>().toEqualTypeOf<
    SanityObjectArray<SanityObject<{str: SanityOptional<SanityString>}>>
  >()
})
test('deep partial on object array type with union elements', () => {
  type Arr = SanityObjectArray<
    SanityObjectUnion<
      | SanityObject<{_type: SanityLiteral<'a'>; str: SanityString}>
      | SanityObject<{_type: SanityLiteral<'b'>; num: SanityNumber}>
    >
  >

  expectTypeOf<DeepPartial<Arr>>().toEqualTypeOf<
    SanityObjectArray<
      SanityObjectUnion<
        | SanityObject<{
            _type: SanityLiteral<'a'>
            str: SanityOptional<SanityString>
          }>
        | SanityObject<{
            _type: SanityLiteral<'b'>
            num: SanityOptional<SanityNumber>
          }>
      >
    >
  >()
})

test('deep partial on nested type', () => {
  type Obj = SanityObject<{
    foo: SanityString
    sub: SanityObject<{
      prop: SanityNumber
      array: SanityObjectArray<
        SanityObjectUnion<
          | SanityObject<{_type: SanityLiteral<'a'>; str: SanityString}>
          | SanityObject<{_type: SanityLiteral<'b'>; num: SanityNumber}>
        >
      >
    }>
  }>

  expectTypeOf<DeepPartial<Obj>>().toEqualTypeOf<
    SanityObject<{
      foo: SanityOptional<SanityString>
      sub: SanityOptional<
        SanityObject<{
          prop: SanityOptional<SanityNumber>
          array: SanityOptional<
            SanityObjectArray<
              SanityObjectUnion<
                | SanityObject<{
                    _type: SanityLiteral<'a'>
                    str: SanityOptional<SanityString>
                  }>
                | SanityObject<{
                    _type: SanityLiteral<'b'>
                    num: SanityOptional<SanityNumber>
                  }>
              >
            >
          >
        }>
      >
    }>
  >()

  assertType<Infer<DeepPartial<Obj>>>({})
  assertType<Infer<DeepPartial<Obj>>>({
    foo: 'bar',
  })
  assertType<Infer<DeepPartial<Obj>>>({
    //@ts-expect-error should be object if provided
    sub: 'bar',
  })
  assertType<Infer<DeepPartial<Obj>>>({
    sub: {
      array: [{_type: 'a', _key: 'xyz', str: 'foo'}],
    },
  })
  assertType<Infer<DeepPartial<Obj>>>({
    sub: {
      //@ts-expect-error _key should still be required
      array: [{str: 'foo'}],
    },
  })
})

test('deep partial on circular object type', () => {
  interface Person {
    _type: 'person'
    name: string
    parent: Omit<Person, 'parent'> & {
      foo: string
      parent?: Omit<Person, 'parent'>
    }
  }

  const LazyPerson: SanityObjectType<Person> = object({
    _type: literal('person'),
    name: lazy(() => string()),
    parent: lazy(() =>
      extend(LazyPerson, {
        foo: string(),
        parent: optional(omit(LazyPerson, ['parent'])),
      }),
    ),
  })

  const PartialLazyPerson = deepPartial(LazyPerson)
  const res = parse(PartialLazyPerson, {})

  expectTypeOf(res).toEqualTypeOf<{
    _type: 'person'
    name?: string | undefined
    parent?:
      | {
          _type: 'person'
          name?: string | undefined
          foo?: string | undefined
          parent?: {_type: 'person'; name?: string | undefined} | undefined
        }
      | undefined
  }>()
})
