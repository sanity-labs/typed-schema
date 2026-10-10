import {expect, test} from 'vitest'

import {literal} from '../creators/literal'
import {never} from '../creators/never'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {union} from '../creators/union'

test('typed object union excludes never types', () => {
  const Union = union([
    object({
      _type: literal('ok'),
      name: string(),
    }),
    never(),
  ])
  const neverType = Union.union.find(schema => {
    // @ts-expect-error - should not be in type system
    return schema.typeName === 'never'
  })
  expect(neverType).toBeUndefined()
})
test('primitive union excludes never types', () => {
  const Union = union([string(), number(), never()])
  const neverType = Union.union.find(schema => {
    // @ts-expect-error - should not be in type system
    return schema.typeName === 'never'
  })
  expect(neverType).toBeUndefined()
})
