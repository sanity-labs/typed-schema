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
    const arraySchema = array(object({foo: string()}))

    type ArrayValueType = {foo: string; _key: string}[]

    type InferredValueType = Infer<typeof arraySchema>
    expectTypeOf<InferredValueType>().toEqualTypeOf<ArrayValueType>()
  })

  test('array type definition with union of objects', () => {
    const arraySchema = array(
      union([
        object({_type: literal('foo'), foo: string()}),
        object({_type: literal('bar'), bar: number()}),
      ]),
    )

    type ExpectedType = (
      | {_type: 'foo'; foo: string; _key: string}
      | {_type: 'bar'; bar: number; _key: string}
    )[]

    type ActualType = Infer<typeof arraySchema>

    expectTypeOf<ActualType>().toEqualTypeOf<ExpectedType>()
  })

  test('array type definition with never', () => {
    const arraySchema = array(never())

    expectTypeOf<Infer<typeof arraySchema>>().toEqualTypeOf<never[]>()
  })
  test('array type definition with object and never', () => {
    const arraySchema = objectArray(
      union([object({_type: literal('foo'), foo: string()}), never()]),
    )

    type ExpectedType = {_type: 'foo'; foo: string; _key: string}[]

    type ActualType = Infer<typeof arraySchema>

    expectTypeOf<ActualType>().toEqualTypeOf<ExpectedType>()
  })
})

describe('arrays of object-like types', () => {
  test('references and images become keyed object arrays', () => {
    const pet = document({_type: literal('pet'), name: string()})
    const refs = array(reference(pet))
    expectTypeOf(refs.typeName).toEqualTypeOf<'objectArray'>()
    expectTypeOf<Infer<typeof refs>[number]['_key']>().toEqualTypeOf<string>()

    const images = array(image({}))
    expectTypeOf(images.typeName).toEqualTypeOf<'objectArray'>()
    expectTypeOf<Infer<typeof images>[number]['_key']>().toEqualTypeOf<string>()
  })
})
