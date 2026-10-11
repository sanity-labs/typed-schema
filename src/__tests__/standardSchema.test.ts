import {describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {type StandardSchemaV1} from '../standardSchema'
import {deepPartial} from '../utils/deepPartial'
import {extend} from '../utils/extend'
import {rename} from '../utils/rename'

const Pet = document({
  _type: literal('pet'),
  name: string(),
  age: number(),
  toys: array(object({name: string()})),
})

function validate<T extends StandardSchemaV1>(schema: T, input: unknown) {
  const result = schema['~standard'].validate(input)
  // allowed by the spec, never returned here
  expect(result).not.toBeInstanceOf(Promise)
  return result as StandardSchemaV1.Result<StandardSchemaV1.InferOutput<T>>
}

describe('~standard', () => {
  test('version and vendor', () => {
    expect(Pet['~standard'].version).toBe(1)
    expect(Pet['~standard'].vendor).toBe('@sanity-labs/typed-schema')
  })

  test('valid input returns the parsed value', () => {
    const input = {_type: 'pet', name: 'Fido', age: 3, toys: [], extra: 1}
    expect(validate(Pet, input)).toEqual({
      value: {_type: 'pet', name: 'Fido', age: 3, toys: []},
    })
  })

  test('invalid input returns every issue with its path', () => {
    const result = validate(Pet, {
      _type: 'pet',
      name: 42,
      toys: [{_key: 'a', name: 1}],
    })
    expect(result.issues).toEqual([
      {path: ['name'], message: 'Expected a string'},
      {path: ['age'], message: 'Expected a finite number'},
      {
        path: ['toys', {key: 0, _key: 'a'}, 'name'],
        message: 'Expected a string',
      },
    ])
  })

  test('works on every schema kind, including lazy and transformed ones', () => {
    expect(validate(string(), 'x')).toEqual({value: 'x'})
    expect(validate(string(), 1).issues).toHaveLength(1)
    expect(
      validate(
        lazy(() => Pet),
        {_type: 'pet'},
      ).issues,
    ).toHaveLength(3)
    expect(validate(deepPartial(Pet), {_type: 'pet', name: 'Fido'})).toEqual({
      value: {_type: 'pet', name: 'Fido'},
    })
  })

  test('works on extended and renamed schemas', () => {
    const Named = extend(object({a: string()}), {b: number()})
    expect(validate(Named, {a: 'x', b: 1})).toEqual({value: {a: 'x', b: 1}})
    expect(validate(Named, {a: 'x'}).issues).toEqual([
      {path: ['b'], message: 'Expected a finite number'},
    ])

    const Cat = rename(Pet, 'cat')
    expect(
      validate(Cat, {_type: 'cat', name: 'Tom', age: 2, toys: []}),
    ).toEqual({value: {_type: 'cat', name: 'Tom', age: 2, toys: []}})
    expect(
      validate(Cat, {_type: 'pet', name: 'Tom', age: 2, toys: []}).issues,
    ).toHaveLength(1)
  })

  test('works on object array elements', () => {
    const element = array(object({n: number()})).element
    expect(validate(element, {_key: 'a', n: 1})).toEqual({
      value: {_key: 'a', n: 1},
    })
    expect(validate(element, {n: 1}).issues).toEqual([
      {path: ['_key'], message: 'Expected a string'},
    ])

    const unionElement = array(
      union([
        object({_type: literal('a'), n: number()}),
        object({_type: literal('b'), s: string()}),
      ]),
    ).element
    expect(validate(unionElement, {_type: 'b', _key: 'k', s: 'x'})).toEqual({
      value: {_type: 'b', _key: 'k', s: 'x'},
    })
    for (const member of unionElement.union) {
      expect(member['~standard'].vendor).toBe('@sanity-labs/typed-schema')
    }
  })

  test('is not enumerable, so schemas stay serializable', () => {
    expect(Object.keys(Pet)).not.toContain('~standard')
    expect(JSON.parse(JSON.stringify(Pet))).not.toHaveProperty('~standard')
    expect(Pet['~standard']).toBe(Pet['~standard'])
  })
})
