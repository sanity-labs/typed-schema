import {describe, expectTypeOf, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {type Infer} from '../defs'
import {extend} from '../utils/extend'

const Pet = object({_type: literal('pet'), name: string()})

describe('.unkeyed', () => {
  test('is typed as the schema given to array()', () => {
    expectTypeOf(array(Pet).element.unkeyed).toEqualTypeOf<typeof Pet>()
  })

  test('unions and their members', () => {
    const Toy = object({_type: literal('toy'), color: string()})
    const Thing = union([Pet, Toy])
    const element = array(Thing).element
    expectTypeOf(element.unkeyed).toEqualTypeOf<typeof Thing>()
    expectTypeOf<
      Infer<(typeof element.union)[number]['unkeyed']>
    >().toEqualTypeOf<Infer<typeof Thing>>()
  })

  test('an array of an element is typed as that element', () => {
    const Item = array(Pet).element
    const Items = array(Item)
    expectTypeOf(Items.element).toEqualTypeOf<typeof Item>()
    expectTypeOf(Items.element.unkeyed).toEqualTypeOf<typeof Pet>()
    expectTypeOf<Infer<typeof Items.element.unkeyed>>().toEqualTypeOf<{
      _type: 'pet'
      name: string
    }>()
  })

  test('transformed objects', () => {
    const Named = extend(object({a: string()}), {b: number()})
    expectTypeOf(array(Named).element.unkeyed).toEqualTypeOf<typeof Named>()
  })

  test('references', () => {
    const Author = document({_type: literal('author'), name: string()})
    const AuthorRef = reference(Author)
    expectTypeOf(array(AuthorRef).element.unkeyed).toEqualTypeOf<
      typeof AuthorRef
    >()
  })

  test('inline array fields', () => {
    const Owner = document({
      _type: literal('owner'),
      pets: array(object({name: string()})),
    })
    expectTypeOf<
      Infer<typeof Owner.shape.pets.element.unkeyed>
    >().toEqualTypeOf<{name: string}>()
  })
})
