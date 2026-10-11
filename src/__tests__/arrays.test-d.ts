import {describe, expectTypeOf, test} from 'vitest'

import {array, objectArray} from '../creators/array'
import {document} from '../creators/document'
import {image} from '../creators/image'
import {literal} from '../creators/literal'
import {never} from '../creators/never'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {type Infer} from '../defs'

describe('array types', () => {
  test('array type definition with object item', () => {
    const ArraySchema = array(object({foo: string()}))

    type ArrayValueType = {foo: string; _key: string}[]

    type InferredValueType = Infer<typeof ArraySchema>
    expectTypeOf<InferredValueType>().toEqualTypeOf<ArrayValueType>()
  })

  test('array type definition with union of objects', () => {
    const ArraySchema = array(
      union([
        object({_type: literal('foo'), foo: string()}),
        object({_type: literal('bar'), bar: number()}),
      ]),
    )

    type ExpectedType = (
      | {_type: 'foo'; foo: string; _key: string}
      | {_type: 'bar'; bar: number; _key: string}
    )[]

    type ActualType = Infer<typeof ArraySchema>

    expectTypeOf<ActualType>().toEqualTypeOf<ExpectedType>()
  })

  test('array type definition with never', () => {
    const ArraySchema = array(never())

    expectTypeOf<Infer<typeof ArraySchema>>().toEqualTypeOf<never[]>()
  })
  test('array type definition with object and never', () => {
    const ArraySchema = objectArray(
      union([object({_type: literal('foo'), foo: string()}), never()]),
    )

    type ExpectedType = {_type: 'foo'; foo: string; _key: string}[]

    type ActualType = Infer<typeof ArraySchema>

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
