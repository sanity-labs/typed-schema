import {describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {parse} from '../parse'
import {deepPartial} from '../utils/deepPartial'
import {extend} from '../utils/extend'

const Pet = object({_type: literal('pet'), name: string()})

describe('object array elements', () => {
  test('keep the schema serializable', () => {
    void array(Pet).element.unkeyed
    expect(JSON.parse(JSON.stringify(array(Pet).element))).toEqual({
      typeName: 'object',
      shape: {
        _type: {typeName: 'literal', value: 'pet'},
        name: {typeName: 'string'},
        _key: {typeName: 'string'},
      },
    })
  })
})

describe('.unkeyed', () => {
  test('of an array element is the schema given to array()', () => {
    expect(array(Pet).element.unkeyed).toBe(Pet)
  })

  test('of a union element and its members', () => {
    const Toy = object({_type: literal('toy'), color: string()})
    const Thing = union([Pet, Toy])
    const element = array(Thing).element
    expect(element.unkeyed).toBe(Thing)
    expect(element.union[0]!.unkeyed).toBe(Pet)
    expect(element.union[1]!.unkeyed).toBe(Toy)
  })

  test('of a reference element', () => {
    const Author = document({_type: literal('author'), name: string()})
    const AuthorRef = reference(Author)
    expect(array(AuthorRef).element.unkeyed).toBe(AuthorRef)
  })

  test('of an array of an element is the original schema', () => {
    const Item = array(Pet).element
    expect(array(Item).element).toBe(Item)
    expect(array(Item).element.unkeyed).toBe(Pet)
  })

  test('of a transformed object', () => {
    const Named = extend(object({a: string()}), {b: number()})
    expect(array(Named).element.unkeyed).toBe(Named)
    const PartialPet = deepPartial(Pet)
    expect(array(PartialPet).element.unkeyed).toBe(PartialPet)
  })

  test('of an inline array field', () => {
    const Owner = document({
      _type: literal('owner'),
      pets: array(object({name: string()})),
    })
    const OwnerPet = Owner.shape.pets.element.unkeyed
    expect(parse(OwnerPet, {name: 'Rex'})).toEqual({
      ok: true,
      value: {name: 'Rex'},
    })
  })
})
