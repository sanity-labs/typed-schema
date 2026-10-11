import {describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {type StandardSchemaV1} from '../standardSchema'
import {deepPartial} from '../utils/deepPartial'

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

  test('is not enumerable, so schemas stay serializable', () => {
    expect(Object.keys(Pet)).not.toContain('~standard')
    expect(JSON.parse(JSON.stringify(Pet))).not.toHaveProperty('~standard')
    expect(Pet['~standard']).toBe(Pet['~standard'])
  })
})
