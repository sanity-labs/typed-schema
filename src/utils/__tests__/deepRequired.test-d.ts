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
import {type DeepRequired, deepRequired} from '../deepRequired'
import {extend} from '../extend'
import {omit} from '../omit'

test('deep required on primitive types', () => {
  expectTypeOf<DeepRequired<StringSchema>>().toEqualTypeOf<StringSchema>()
  expectTypeOf<DeepRequired<BooleanSchema>>().toEqualTypeOf<BooleanSchema>()
  expectTypeOf<DeepRequired<NumberSchema>>().toEqualTypeOf<NumberSchema>()
})

test('deep required on shallow object type', () => {
  type Obj = ObjectSchema<{foo: OptionalSchema<StringSchema>}>
  expectTypeOf<DeepRequired<Obj>>().toEqualTypeOf<
    ObjectSchema<{foo: StringSchema}>
  >()
})

test('deep required on shallow document type', () => {
  type Doc = DocumentSchema<{
    _type: LiteralSchema<'test'> // _type can never be optional
    _id: OptionalSchema<StringSchema>
    _createdAt: OptionalSchema<StringSchema>
    _updatedAt: OptionalSchema<StringSchema>
    _rev: OptionalSchema<StringSchema>
    foo: OptionalSchema<StringSchema>
  }>

  expectTypeOf<DeepRequired<Doc>>().toEqualTypeOf<
    DocumentSchema<{
      _type: LiteralSchema<'test'>
      _id: StringSchema
      _createdAt: StringSchema
      _updatedAt: StringSchema
      _rev: StringSchema
      foo: StringSchema
    }>
  >()
})

test('deep required on union types', () => {
  type Union = ObjectUnionSchema<
    | ObjectSchema<{
        _type: LiteralSchema<'a'>
        str: OptionalSchema<StringSchema>
      }>
    | ObjectSchema<{
        _type: LiteralSchema<'b'>
        num: OptionalSchema<NumberSchema>
      }>
  >

  expectTypeOf<DeepRequired<Union>>().toEqualTypeOf<
    ObjectUnionSchema<
      | ObjectSchema<{_type: LiteralSchema<'a'>; str: StringSchema}>
      | ObjectSchema<{_type: LiteralSchema<'b'>; num: NumberSchema}>
    >
  >()
})

test('deep required on literal types', () => {
  type Obj = ObjectSchema<{foo: OptionalSchema<LiteralSchema<'bar'>>}>
  expectTypeOf<DeepRequired<Obj>>().toEqualTypeOf<
    ObjectSchema<{foo: LiteralSchema<'bar'>}>
  >()
})

test('deep required on object array type', () => {
  type Arr = ObjectArraySchema<
    ObjectSchema<{str: OptionalSchema<StringSchema>}>
  >

  expectTypeOf<DeepRequired<Arr>>().toEqualTypeOf<
    ObjectArraySchema<ObjectSchema<{str: StringSchema}>>
  >()
})
test('deep required on object array type with union elements', () => {
  type Arr = ObjectArraySchema<
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

  expectTypeOf<DeepRequired<Arr>>().toEqualTypeOf<
    ObjectArraySchema<
      ObjectUnionSchema<
        | ObjectSchema<{_type: LiteralSchema<'a'>; str: StringSchema}>
        | ObjectSchema<{_type: LiteralSchema<'b'>; num: NumberSchema}>
      >
    >
  >()
})

test('deep required on nested type', () => {
  type Obj = ObjectSchema<{
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

  expectTypeOf<DeepRequired<Obj>>().toEqualTypeOf<
    ObjectSchema<{
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
  >()

  assertType<Infer<DeepRequired<Obj>>>({foo: 'bar', sub: {array: [], prop: 2}})
  // @ts-expect-error - sub is required
  assertType<Infer<DeepRequired<Obj>>>({
    foo: 'bar',
  })
  assertType<Infer<DeepRequired<Obj>>>({
    //@ts-expect-error should be object if provided
    sub: 'bar',
  })
  assertType<Infer<DeepRequired<Obj>>>({
    foo: '',
    sub: {
      prop: 1,
      array: [{_type: 'a', _key: 'xyz', str: 'foo'}],
    },
  })
})

test('deep required on circular object type', () => {
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

  const RequiredLazyPerson = deepRequired(LazyPerson)
  const resResult = parse(RequiredLazyPerson, {})
  assert(resResult.ok)
  const res = resResult.value

  expectTypeOf(res).toEqualTypeOf<{
    _type: 'person'
    name: string
    parent: {
      _type: 'person'
      name: string
      foo: string
      parent: {_type: 'person'; name: string}
    }
  }>()
})

test('DeepRequired of a union of documents is a union of the transformed documents', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Docs = union([Author, Book])
  expectTypeOf(deepRequired(Docs)).toEqualTypeOf<
    DocumentUnionSchema<DeepRequired<typeof Author> | DeepRequired<typeof Book>>
  >()
})
