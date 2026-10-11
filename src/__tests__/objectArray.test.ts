import {describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {image} from '../creators/image'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {parse} from '../parse'

const Pet = document({_type: literal('pet'), name: string()})

describe('arrays of object-like types are keyed object arrays', () => {
  test('array of references', () => {
    const Pets = array(reference(Pet))
    expect(Pets.typeName).toBe('objectArray')
    const value = [{_type: 'reference', _ref: 'fido', _key: 'k1'}]
    expect(parse(Pets, value)).toEqual({ok: true, value})
    expect(parse(Pets, [{_type: 'reference', _ref: 'fido'}]).ok).toBe(false)
  })

  test('array of images', () => {
    const Images = array(image())
    expect(Images.typeName).toBe('objectArray')
    const value = [
      {
        _type: 'image',
        _key: 'k1',
        asset: {_type: 'reference', _ref: 'image-abc-100x100-png'},
      },
    ]
    expect(parse(Images, value)).toEqual({ok: true, value})
  })

  test('array of a union containing non-object types', () => {
    const Items = array(
      union([object({_type: literal('note'), text: string()}), image()]),
    )
    expect(Items.typeName).toBe('objectArray')
    const value = [
      {_type: 'note', _key: 'k1', text: 'hi'},
      {
        _type: 'image',
        _key: 'k2',
        asset: {_type: 'reference', _ref: 'image-abc-100x100-png'},
      },
    ]
    expect(parse(Items, value)).toEqual({ok: true, value})
    expect(parse(Items, [{_type: 'note', text: 'no key'}]).ok).toBe(false)
  })

  test('array of nested unions', () => {
    const Items = array(
      union([
        object({_type: literal('a')}),
        union([object({_type: literal('b')}), object({_type: literal('c')})]),
      ]),
    )
    expect(Items.typeName).toBe('objectArray')
    const value = [
      {_type: 'a', _key: 'k1'},
      {_type: 'c', _key: 'k2'},
    ]
    expect(parse(Items, value)).toEqual({ok: true, value})
    expect(parse(Items, [{_type: 'c'}]).ok).toBe(false)
  })

  test('arrays of primitives stay primitive arrays', () => {
    expect(array(string()).typeName).toBe('primitiveArray')
    expect(array(union([literal('a'), literal('b')])).typeName).toBe(
      'primitiveArray',
    )
  })
})
