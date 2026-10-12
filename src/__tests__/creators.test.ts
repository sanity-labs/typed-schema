import {describe, expect, test} from 'vitest'

import {array, objectArray, primitiveArray} from '../creators/array'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {type ObjectSchemaOf} from '../defs'
import {extend} from '../utils/extend'

describe('circular schemas', () => {
  test('Circular ObjectSchemaOf', () => {
    interface Human {
      _type: 'human'
      name: string
      age: number
    }

    //@ts-expect-error - should fail because name is not optional in the Human type, so they are not compatible
    const Human: ObjectSchemaOf<Human> = object({
      _type: literal('human'),
      name: optional(string()),
      age: number(),
      parent: lazy(() => extend(Human, {extra: number()})),
    })
  })

  test('Circular ObjectSchemaOf type with extended inner type', () => {
    interface Human {
      _type: 'human'
      name?: string
      age: number
      parent?: Human & {additionalInfo: string}
    }

    // @ts-expect-error – the schema declare the extended 'parent.additionalInfo' as optional, but that's not compatible with interface
    const Human: ObjectSchemaOf<Human> = object({
      _type: literal('human'),
      name: optional(string()),
      age: number(),
      parent: optional(
        lazy(() =>
          extend(Human, {
            additionalInfo: optional(string()),
          }),
        ),
      ),
    })
  })
})

test('Restrictions', () => {
  // @ts-expect-error array of array is not allowed
  array(array(number()))

  // @ts-expect-error array of array is not allowed
  array(array(object({foo: string()})))

  // @ts-expect-error objectArray of a primitive value is not allowed
  objectArray(string())

  expect(() => {
    primitiveArray(
      // @ts-expect-error mixed array (containing both objects and primitives) is not supported
      union([object({_type: literal('test'), foo: string()}), string()]),
    )
  }).toThrowErrorMatchingInlineSnapshot(
    `[Error: Union types must either be of primitive values or typed objects]`,
  )

  expect(() =>
    // @ts-expect-error mixed array (containing both objects and primitives) is not supported
    objectArray(union([object({foo: string()}), string()])),
  ).toThrowErrorMatchingInlineSnapshot(
    `[Error: Union types must either be of primitive values or typed objects]`,
  )
})
