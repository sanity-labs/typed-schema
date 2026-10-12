import {assertType, test} from 'vitest'

import {
  type LazySchema,
  type LiteralSchema,
  type ObjectArraySchema,
  type ObjectSchema,
  type OutputOf,
  type StringSchema,
} from '../defs'

test('lazy string type', () => {
  type Lazy = LazySchema<StringSchema>

  assertType<OutputOf<Lazy>>('foo')
  //@ts-expect-error - not compatible with number
  assertType<OutputOf<Lazy>>(22)
})

test('lazy object type', () => {
  type Lazy = LazySchema<
    ObjectSchema<{
      foo: StringSchema
      lazy: LazySchema<LiteralSchema<'literally this'>>
    }>
  >

  assertType<OutputOf<Lazy>>({foo: 'bar', lazy: 'literally this'})

  // @ts-expect-error - not compatible with array
  assertType<OutputOf<Lazy>>([])
})

test('lazy array type', () => {
  type Lazy = LazySchema<
    ObjectArraySchema<
      ObjectSchema<{_key: StringSchema; foo: LazySchema<StringSchema>}>
    >
  >

  assertType<OutputOf<Lazy>>([])
  assertType<OutputOf<Lazy>>([{_key: 'abc', foo: 'bar'}])
  // @ts-expect-error - not compatible with array of strings
  assertType<OutputOf<Lazy>>(['foo'])
})
