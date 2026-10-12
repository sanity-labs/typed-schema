import {assert, assertType, expectTypeOf, test} from 'vitest'

import {document} from '../../creators/document'
import {lazy} from '../../creators/lazy'
import {literal} from '../../creators/literal'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {string} from '../../creators/string'
import {union} from '../../creators/union'
import {
  type Infer,
  type BooleanSchema,
  type DocumentSchema,
  type LiteralSchema,
  type NumberSchema,
  type ObjectSchema,
  type ObjectArraySchema,
  type ObjectSchemaOf,
  type ObjectUnionSchema,
  type OptionalSchema,
  type StringSchema,
  type DocumentUnionSchema,
} from '../../defs'
import {parse} from '../../parse'
import {type DeepPartial, deepPartial} from '../deepPartial'
import {extend} from '../extend'
import {omit} from '../omit'

test('deep partial on primitive types', () => {
  expectTypeOf<DeepPartial<StringSchema>>().toEqualTypeOf<StringSchema>()
  expectTypeOf<DeepPartial<BooleanSchema>>().toEqualTypeOf<BooleanSchema>()
  expectTypeOf<DeepPartial<NumberSchema>>().toEqualTypeOf<NumberSchema>()
})

test('deep partial on shallow object type', () => {
  type Obj = ObjectSchema<{foo: StringSchema}>
  expectTypeOf<DeepPartial<Obj>>().toEqualTypeOf<
    ObjectSchema<{foo: OptionalSchema<StringSchema>}>
  >()
})

test('deep partial on shallow document type', () => {
  type Doc = DocumentSchema<{
    _type: LiteralSchema<'test'> // _type can never be optional
    _id: OptionalSchema<StringSchema>
    _createdAt: OptionalSchema<StringSchema>
    _updatedAt: OptionalSchema<StringSchema>
    _rev: OptionalSchema<StringSchema>
    foo: StringSchema
  }>
  expectTypeOf<DeepPartial<Doc>>().toEqualTypeOf<
    DocumentSchema<{
      _type: LiteralSchema<'test'> // _type can never be optional
      _id: OptionalSchema<StringSchema>
      _createdAt: OptionalSchema<StringSchema>
      _updatedAt: OptionalSchema<StringSchema>
      _rev: OptionalSchema<StringSchema>
      foo: OptionalSchema<StringSchema>
    }>
  >()
})

test('deep partial on union types', () => {
  type Union = ObjectUnionSchema<
    | ObjectSchema<{_type: LiteralSchema<'a'>; str: StringSchema}>
    | ObjectSchema<{_type: LiteralSchema<'b'>; num: NumberSchema}>
  >

  expectTypeOf<DeepPartial<Union>>().toEqualTypeOf<
    ObjectUnionSchema<
      | ObjectSchema<{
          _type: LiteralSchema<'a'>
          str: OptionalSchema<StringSchema>
        }>
      | ObjectSchema<{
          _type: LiteralSchema<'b'>
          num: OptionalSchema<NumberSchema>
        }>
    >
  >()
})

test('deep partial on literal types', () => {
  type Obj = ObjectSchema<{foo: LiteralSchema<'bar'>}>
  expectTypeOf<DeepPartial<Obj>>().toEqualTypeOf<
    ObjectSchema<{foo: OptionalSchema<LiteralSchema<'bar'>>}>
  >()
})

test('deep partial on object array type', () => {
  type Arr = ObjectArraySchema<ObjectSchema<{str: StringSchema}>>

  expectTypeOf<DeepPartial<Arr>>().toEqualTypeOf<
    ObjectArraySchema<ObjectSchema<{str: OptionalSchema<StringSchema>}>>
  >()
})
test('deep partial on object array type with union elements', () => {
  type Arr = ObjectArraySchema<
    ObjectUnionSchema<
      | ObjectSchema<{_type: LiteralSchema<'a'>; str: StringSchema}>
      | ObjectSchema<{_type: LiteralSchema<'b'>; num: NumberSchema}>
    >
  >

  expectTypeOf<DeepPartial<Arr>>().toEqualTypeOf<
    ObjectArraySchema<
      ObjectUnionSchema<
        | ObjectSchema<{
            _type: LiteralSchema<'a'>
            str: OptionalSchema<StringSchema>
          }>
        | ObjectSchema<{
            _type: LiteralSchema<'b'>
            num: OptionalSchema<NumberSchema>
          }>
      >
    >
  >()
})

test('deep partial on nested type', () => {
  type Obj = ObjectSchema<{
    foo: StringSchema
    sub: ObjectSchema<{
      prop: NumberSchema
      array: ObjectArraySchema<
        ObjectUnionSchema<
          | ObjectSchema<{_type: LiteralSchema<'a'>; str: StringSchema}>
          | ObjectSchema<{_type: LiteralSchema<'b'>; num: NumberSchema}>
        >
      >
    }>
  }>

  expectTypeOf<DeepPartial<Obj>>().toEqualTypeOf<
    ObjectSchema<{
      foo: OptionalSchema<StringSchema>
      sub: OptionalSchema<
        ObjectSchema<{
          prop: OptionalSchema<NumberSchema>
          array: OptionalSchema<
            ObjectArraySchema<
              ObjectUnionSchema<
                | ObjectSchema<{
                    _type: LiteralSchema<'a'>
                    str: OptionalSchema<StringSchema>
                  }>
                | ObjectSchema<{
                    _type: LiteralSchema<'b'>
                    num: OptionalSchema<NumberSchema>
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

  const LazyPerson: ObjectSchemaOf<Person> = object({
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
  const resResult = parse(PartialLazyPerson, {})
  assert(resResult.ok)
  const res = resResult.value

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

test('DeepPartial of a union of documents is a union of the transformed documents', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Docs = union([Author, Book])
  expectTypeOf(deepPartial(Docs)).toEqualTypeOf<
    DocumentUnionSchema<DeepPartial<typeof Author> | DeepPartial<typeof Book>>
  >()
})
