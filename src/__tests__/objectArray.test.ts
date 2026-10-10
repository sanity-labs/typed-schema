import {describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {image} from '../creators/image'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {parse, safeParse} from '../parse'

const pet = document({_type: literal('pet'), name: string()})

describe('arrays of object-like types are keyed object arrays', () => {
  test('array of references', () => {
    const pets = array(reference(pet))
    expect(pets.typeName).toBe('objectArray')
    const value = [{_type: 'reference', _ref: 'fido', _key: 'k1'}]
    expect(parse(pets, value)).toEqual(value)
    expect(safeParse(pets, [{_type: 'reference', _ref: 'fido'}]).status).toBe(
      'fail',
    )
  })

  test('array of images', () => {
    const images = array(image({}))
    expect(images.typeName).toBe('objectArray')
    const value = [
      {
        _type: 'image',
        _key: 'k1',
        asset: {_type: 'reference', _ref: 'image-abc-100x100-png'},
      },
    ]
    expect(parse(images, value)).toEqual(value)
  })

  test('array of a union containing non-object types', () => {
    const items = array(
      union([object({_type: literal('note'), text: string()}), image({})]),
    )
    expect(items.typeName).toBe('objectArray')
    const value = [
      {_type: 'note', _key: 'k1', text: 'hi'},
      {
        _type: 'image',
        _key: 'k2',
        asset: {_type: 'reference', _ref: 'image-abc-100x100-png'},
      },
    ]
    expect(parse(items, value)).toEqual(value)
    expect(safeParse(items, [{_type: 'note', text: 'no key'}]).status).toBe(
      'fail',
    )
  })

  test('array of nested unions', () => {
    const items = array(
      union([
        object({_type: literal('a')}),
        union([object({_type: literal('b')}), object({_type: literal('c')})]),
      ]),
    )
    expect(items.typeName).toBe('objectArray')
    const value = [
      {_type: 'a', _key: 'k1'},
      {_type: 'c', _key: 'k2'},
    ]
    expect(parse(items, value)).toEqual(value)
    expect(safeParse(items, [{_type: 'c'}]).status).toBe('fail')
  })

  test('arrays of primitives stay primitive arrays', () => {
    expect(array(string()).typeName).toBe('primitiveArray')
    expect(array(union([literal('a'), literal('b')])).typeName).toBe(
      'primitiveArray',
    )
  })
})
