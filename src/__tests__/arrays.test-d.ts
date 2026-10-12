import {describe, expectTypeOf, test} from 'vitest'

import {array, objectArray, primitiveArray} from '../creators/array'
import {document} from '../creators/document'
import {image} from '../creators/image'
import {literal} from '../creators/literal'
import {never} from '../creators/never'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {
  type Infer,
  type NumberSchema,
  type OptionalSchema,
  type PrimitiveArraySchema,
  type StringSchema,
} from '../defs'
import {type ArrayElementError} from '../helpers/schemaErrors'

describe('array types', () => {
  test('array type definition with object item', () => {
    const schema = array(object({foo: string()}))

    type ArrayValueType = {foo: string; _key: string}[]

    type InferredValueType = Infer<typeof schema>
    expectTypeOf<InferredValueType>().toEqualTypeOf<ArrayValueType>()
  })

  test('array type definition with union of objects', () => {
    const schema = array(
      union([
        object({_type: literal('foo'), foo: string()}),
        object({_type: literal('bar'), bar: number()}),
      ]),
    )

    type ExpectedType = (
      | {_type: 'foo'; foo: string; _key: string}
      | {_type: 'bar'; bar: number; _key: string}
    )[]

    type ActualType = Infer<typeof schema>

    expectTypeOf<ActualType>().toEqualTypeOf<ExpectedType>()
  })

  test('array type definition with never', () => {
    const schema = array(never())

    expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<never[]>()
  })
  test('array type definition with object and never', () => {
    const schema = objectArray(
      union([object({_type: literal('foo'), foo: string()}), never()]),
    )

    type ExpectedType = {_type: 'foo'; foo: string; _key: string}[]

    type ActualType = Infer<typeof schema>

    expectTypeOf<ActualType>().toEqualTypeOf<ExpectedType>()
  })
})

describe('arrays of object-like types', () => {
  test('references and images become keyed object arrays', () => {
    const Pet = document({_type: literal('pet'), name: string()})
    const Refs = array(reference(Pet))
    expectTypeOf(Refs.typeName).toEqualTypeOf<'objectArray'>()
    expectTypeOf<Infer<typeof Refs>[number]['_key']>().toEqualTypeOf<string>()

    const Images = array(image())
    expectTypeOf(Images.typeName).toEqualTypeOf<'objectArray'>()
    expectTypeOf<Infer<typeof Images>[number]['_key']>().toEqualTypeOf<string>()
  })
})

describe('object array element', () => {
  test('is the element schema with a _key field', () => {
    const element = array(object({n: number()})).element
    expectTypeOf(element.typeName).toEqualTypeOf<'object'>()
    expectTypeOf(element.shape._key).toEqualTypeOf<StringSchema>()
    expectTypeOf(element.shape.n).toEqualTypeOf<NumberSchema>()
    expectTypeOf<Infer<typeof element>>().toEqualTypeOf<{
      n: number
      _key: string
    }>()
  })

  test('of a union adds the _key field to every member', () => {
    const element = array(
      union([
        object({_type: literal('foo'), foo: string()}),
        object({_type: literal('bar'), bar: number()}),
      ]),
    ).element
    expectTypeOf(element.typeName).toEqualTypeOf<'union'>()
    expectTypeOf<
      (typeof element)['union'][number]['shape']['_key']
    >().toEqualTypeOf<StringSchema>()
    expectTypeOf<Infer<typeof element>>().toEqualTypeOf<
      | {_type: 'foo'; foo: string; _key: string}
      | {_type: 'bar'; bar: number; _key: string}
    >()
  })

  test('of references and images', () => {
    const Pet = document({_type: literal('pet'), name: string()})
    const refElement = array(reference(Pet)).element
    expectTypeOf(refElement.typeName).toEqualTypeOf<'reference'>()
    expectTypeOf<Infer<typeof refElement>['_key']>().toEqualTypeOf<string>()

    const imageElement = array(image()).element
    expectTypeOf(imageElement.typeName).toEqualTypeOf<'image'>()
    expectTypeOf<Infer<typeof imageElement>['_key']>().toEqualTypeOf<string>()
  })
})

describe('invalid array elements', () => {
  test('are rejected', () => {
    const Link = object({_type: literal('link'), href: string()})

    // @ts-expect-error - arrays cannot contain arrays
    array(array(string()))
    // @ts-expect-error - arrays cannot contain arrays
    array(array(object({foo: string()})))
    // @ts-expect-error - elements cannot be optional
    array(optional(string()))
    // @ts-expect-error - a union cannot mix primitives and objects
    array(union([string(), Link]))
    const members = [string(), Link]
    // @ts-expect-error - a union cannot mix primitives and objects
    array(union(members))

    expectTypeOf(array(string())).toEqualTypeOf<
      PrimitiveArraySchema<StringSchema>
    >()
  })

  test('of objectArray() and primitiveArray() are rejected', () => {
    // @ts-expect-error - objectArray() elements must be object-like
    objectArray(string())
    // @ts-expect-error - primitiveArray() elements must be primitives
    primitiveArray(object({_type: literal('x'), foo: string()}))

    objectArray(object({_type: literal('x'), foo: string()}))
    primitiveArray(string())
  })

  test('report why', () => {
    expectTypeOf<
      ArrayElementError<PrimitiveArraySchema<StringSchema>>
    >().toEqualTypeOf<'array() elements cannot be arrays. Wrap the inner array in an object'>()
    expectTypeOf<
      ArrayElementError<OptionalSchema<StringSchema>>
    >().toEqualTypeOf<'array() elements cannot be optional'>()
  })
})
