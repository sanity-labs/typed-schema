import {assert, expectTypeOf, test} from 'vitest'

import {enum as enumOf} from '../creators/enum'
import {type EnumSchema, type Infer} from '../defs'
import * as s from '../index'
import {parse} from '../parse'

test('define string array enum', () => {
  expectTypeOf<Infer<EnumSchema<['foo', 'bar', 'baz']>>>().toEqualTypeOf<
    'foo' | 'bar' | 'baz'
  >()
  expectTypeOf<Infer<EnumSchema<['foo', 'bar']>>>().toEqualTypeOf<
    // @ts-expect-error 'baz' is not valid
    'foo' | 'bar' | 'baz'
  >()
})

test('define object literal enum', () => {
  expectTypeOf<Infer<EnumSchema<{foo: 1; bar: 2; baz: 'baz'}>>>().toEqualTypeOf<
    1 | 2 | 'baz'
  >()

  expectTypeOf<Infer<EnumSchema<{foo: 1; bar: 2}>>>().toEqualTypeOf<
    // @ts-expect-error 'baz' is not valid
    1 | 2 | 'baz'
  >()
})

test('parse string array enum', () => {
  const result = parse(enumOf(['a', 'b', 'c']), 'a')
  assert(result.ok)
  expectTypeOf(result.value).toEqualTypeOf<'a' | 'b' | 'c'>()
})

test('parse object literal enum', () => {
  const result = parse(enumOf({foo: 'a', bar: 'b', baz: 'c'}), 'a')
  assert(result.ok)
  expectTypeOf(result.value).toEqualTypeOf<'a' | 'b' | 'c'>()
})

test('enum is exported from the package root', () => {
  expectTypeOf(s.enum).toEqualTypeOf(enumOf)
  expectTypeOf<Infer<typeof Status>>().toEqualTypeOf<'draft' | 'published'>()
})

const Status = s.enum(['draft', 'published'])
