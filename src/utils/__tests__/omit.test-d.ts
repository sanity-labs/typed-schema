import {expectTypeOf, test} from 'vitest'

import {
  type BooleanSchema,
  type DocumentSchema,
  type NumberSchema,
  type StringSchema,
} from '../../defs'
import {type OmitObjectLike} from '../omit'

test('omit from document', () => {
  type Doc = DocumentSchema<{
    foo: StringSchema
    bar: NumberSchema
    baz: BooleanSchema
  }>
  expectTypeOf<OmitObjectLike<Doc, ['foo', 'bar']>>().toEqualTypeOf<
    DocumentSchema<{
      baz: BooleanSchema
    }>
  >()

  expectTypeOf<OmitObjectLike<Doc, ['foo']>>().toEqualTypeOf<
    // @ts-expect-error foo should not be part of the new type
    DocumentSchema<{
      foo: StringSchema
      bar: NumberSchema
    }>
  >()
})
