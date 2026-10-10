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
    expect(() => parse(NeverType, undefined)).toThrow()
    expect(() => parse(NeverType, 1)).toThrow()
    expect(() => parse(NeverType, {foo: 'bar'})).toThrow()
  })
  test('does not throw when included in union', () => {
    const UnionWithNever = union([never(), string()])
    expect(() => parse(UnionWithNever, 'some string')).not.toThrow()
    const ObjectUnionWithNever = union([
      object({_type: literal('foo'), foo: string()}),
      never(),
    ])
    expect(() =>
      parse(ObjectUnionWithNever, {_type: 'foo', foo: 'bar'}),
    ).not.toThrow()
  })
  test('does not throw for empty arrays', () => {
    const ArrayWithNever = array(never())
    expect(() => parse(ArrayWithNever, [])).not.toThrow()
  })
  test('does not throw for if included with arrays', () => {
    const ArrayWithNever = array(union([never(), string()]))
    expect(() => parse(ArrayWithNever, [])).not.toThrow()

    const ObjectArrayWithNever = array(
      union([never(), object({_type: literal('foo'), foo: string()})]),
    )
    expect(() => parse(ObjectArrayWithNever, [])).not.toThrow()
  })
  test('throw for non-empty arrays', () => {
    const UnionWithNever = array(never())
    expect(() => parse(UnionWithNever, ['foo'])).toThrow()
    expect(() => parse(UnionWithNever, [{}])).toThrow()
  })
})
