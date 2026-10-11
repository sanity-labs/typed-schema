import {assertType, expectTypeOf, test} from 'vitest'

import {document} from '../../creators/document'
import {literal} from '../../creators/literal'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {string} from '../../creators/string'
import {
  type Infer,
  type SanityLiteral,
  type SanityNumber,
  type SanityObject,
  type SanityObjectArray,
  type SanityObjectUnion,
  type SanityOptional,
  type SanityString,
} from '../../defs'
import {parse} from '../../parse'
import {type ShallowPartial, shallowPartial} from '../shallowPartial'

test('shallow partial on nested type', () => {
  type Nested = {
    prop: SanityNumber
    array: SanityObjectArray<
      SanityObjectUnion<
        | SanityObject<{_type: SanityLiteral<'a'>; str: SanityString}>
        | SanityObject<{_type: SanityLiteral<'b'>; num: SanityNumber}>
      >
    >
  }

  type Obj = SanityObject<{
    foo: SanityString
    sub: SanityObject<Nested>
  }>

  expectTypeOf<ShallowPartial<Obj>>().toEqualTypeOf<
    SanityObject<{
      foo: SanityOptional<SanityString>
      sub: SanityOptional<SanityObject<Nested>>
    }>
  >()

  assertType<Infer<ShallowPartial<Obj>>>({})
  assertType<Infer<ShallowPartial<Obj>>>({
    foo: 'bar',
  })
  assertType<Infer<ShallowPartial<Obj>>>({
    //@ts-expect-error should be object if provided
    sub: 'bar',
  })
  assertType<Infer<ShallowPartial<Obj>>>({})
  assertType<Infer<ShallowPartial<Obj>>>({
    sub: {
      //@ts-expect-error _key should still be required
      array: [{str: 'foo'}],
    },
  })
})

test('shallow partial on document schema', () => {
  const Pet = document({
    _type: literal('pet'),
    name: string(),
    owner: object({name: string()}),
  })
  const pet = parse(shallowPartial(Pet), {_type: 'pet'})
  expectTypeOf(pet).not.toBeNever()
  expectTypeOf(pet).toEqualTypeOf<{
    _type: 'pet'
    _id?: string | undefined
    _createdAt?: string | undefined
    _updatedAt?: string | undefined
    _rev?: string | undefined
    name?: string | undefined
    owner?: {name: string} | undefined
  }>()

  assertType<Infer<ShallowPartial<typeof Pet>>>({_type: 'pet'})
  //@ts-expect-error _type stays required
  assertType<Infer<ShallowPartial<typeof Pet>>>({})
  assertType<Infer<ShallowPartial<typeof Pet>>>({
    _type: 'pet',
    //@ts-expect-error nested fields stay required
    owner: {},
  })
})

test('shallow partial keeps _type required on typed objects', () => {
  const Thing = object({_type: literal('thing'), name: optional(string())})
  expectTypeOf(parse(shallowPartial(Thing), {_type: 'thing'})).toEqualTypeOf<{
    _type: 'thing'
    name?: string | undefined
  }>()
})
