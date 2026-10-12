import {expectTypeOf, test} from 'vitest'

import {
  type BooleanSchema,
  type DocumentSchema,
  type NumberSchema,
  type StringSchema,
} from '../../defs'
import {type PickShape} from '../pick'

test('pick from document', () => {
  type Doc = DocumentSchema<{
    foo: StringSchema
    bar: NumberSchema
    baz: BooleanSchema
  }>
  expectTypeOf<PickShape<Doc, ['foo', 'bar']>>().toEqualTypeOf<
    DocumentSchema<{
      foo: StringSchema
      bar: NumberSchema
    }>
  >()

  expectTypeOf<PickShape<Doc, ['foo']>>().toEqualTypeOf<
    // @ts-expect-error bar should not be part of the new type
    DocumentSchema<{
      foo: StringSchema
      bar: NumberSchema
    }>
  >()
})
