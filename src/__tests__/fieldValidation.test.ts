import {describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {file} from '../creators/file'
import {image} from '../creators/image'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {deferGetters} from '../helpers/deferGetters'
import {parse} from '../parse'
import {extend} from '../utils/extend'

// Typed as `any` so the runtime check is exercised even where the creator's
// type signature would reject it
const notSchemas: [string, any][] = [
  ['a string', 'bar'],
  ['a number', 1],
  ['null', null],
  ['undefined', undefined],
  ['an object without typeName', {}],
  ['an object with a non-string typeName', {typeName: 1}],
  ['an array', [string()]],
  ['a creator function', string],
]

describe('creators reject field values that are not schemas', () => {
  const Base = object({_type: literal('base'), name: string()})
  const creators: [string, (value: any) => unknown][] = [
    ['object', value => object({_type: literal('x'), foo: value})],
    ['document', value => document({_type: literal('x'), foo: value})],
    ['image', value => image({foo: value})],
    ['file', value => file({foo: value})],
    ['extend', value => extend(Base, {foo: value})],
  ]

  describe.each(creators)('%s', (_, create) => {
    test.each(notSchemas)('throws on %s', (__, value) => {
      expect(() => create(value)).toThrow('Field "foo" is not a schema')
    })

    test('accepts schema values', () => {
      expect(() => create(string())).not.toThrow()
    })
  })

  test('rejects a non-schema value next to a getter field', () => {
    expect(() =>
      object({
        _type: literal('x'),
        foo: 'bar' as any,
        get items() {
          return array(string())
        },
      }),
    ).toThrow('Field "foo" is not a schema')
  })
})

describe('fields the type-level check skips', () => {
  test('a getter returning a non-schema throws when the field is first parsed', () => {
    const schema = object({
      _type: literal('x'),
      get foo() {
        return 'bar'
      },
    })
    expect(() => parse(schema, {_type: 'x', foo: 'x'})).toThrow(
      'Field "foo" is not a schema',
    )
  })

  test('readonly fields are checked when the schema is created', () => {
    expect(() =>
      object(Object.freeze({_type: literal('x'), foo: 'bar'})),
    ).toThrow('Field "foo" is not a schema')
  })
})

describe('deferGetters', () => {
  test('does not call getters', () => {
    let calls = 0
    const shape = {
      name: string(),
      get items() {
        calls++
        return 'not a schema' as any
      },
    }
    const deferred = deferGetters(shape)
    expect(calls).toBe(0)
    expect(deferred.items).toMatchObject({typeName: 'lazy'})
    expect(calls).toBe(0)
  })

  test('does not call getters that would throw', () => {
    // Like a recursive schema whose getter references a not yet initialized `const`
    const schema = object({
      _type: literal('x'),
      get items(): any {
        throw new ReferenceError('Cannot access before initialization')
      },
    })
    expect(schema.shape.items).toMatchObject({typeName: 'lazy'})
  })

  test('returns the same shape object when there are no getters', () => {
    const shape = {_type: literal('x'), name: string()}
    expect(deferGetters(shape)).toBe(shape)
  })
})
