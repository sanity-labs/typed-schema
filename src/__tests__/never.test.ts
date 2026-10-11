import {describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {literal} from '../creators/literal'
import {never} from '../creators/never'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {parse} from '../parse'

describe('never type', () => {
  test('fails for any value', () => {
    const NeverType = never()
    expect(parse(NeverType, undefined).ok).toBe(false)
    expect(parse(NeverType, 1).ok).toBe(false)
    expect(parse(NeverType, {foo: 'bar'}).ok).toBe(false)
  })
  test('accepts a union member that is not never', () => {
    const UnionWithNever = union([never(), string()])
    expect(parse(UnionWithNever, 'some string').ok).toBe(true)
    const ObjectUnionWithNever = union([
      object({_type: literal('foo'), foo: string()}),
      never(),
    ])
    expect(parse(ObjectUnionWithNever, {_type: 'foo', foo: 'bar'}).ok).toBe(
      true,
    )
  })
  test('accepts empty arrays', () => {
    const ArrayWithNever = array(never())
    expect(parse(ArrayWithNever, []).ok).toBe(true)
  })
  test('accepts empty arrays of a union with never', () => {
    const ArrayWithNever = array(union([never(), string()]))
    expect(parse(ArrayWithNever, []).ok).toBe(true)

    const ObjectArrayWithNever = array(
      union([never(), object({_type: literal('foo'), foo: string()})]),
    )
    expect(parse(ObjectArrayWithNever, []).ok).toBe(true)
  })
  test('rejects non-empty arrays', () => {
    const UnionWithNever = array(never())
    expect(parse(UnionWithNever, ['foo']).ok).toBe(false)
    expect(parse(UnionWithNever, [{}]).ok).toBe(false)
  })
})
