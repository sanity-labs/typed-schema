import {describe, expectTypeOf, test} from 'vitest'

import {image} from '../creators/image'
import {string} from '../creators/string'
import {
  type DocumentSchema,
  type Infer,
  type Parsed,
  type REF_SCHEMA,
} from '../defs'
import {type ImageAssetShape} from '../shapeDefs'

describe('image type', () => {
  test('plain image type definition', () => {
    const schema = image()

    type ImageValue = {
      _type: 'image'
      asset: {
        _type: 'reference'
        _ref: string
        _weak?: boolean
      }
    }

    expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<ImageValue>()
  })
  test('without a shape, the output has no extra keys', () => {
    const schema = image()

    expectTypeOf<keyof Infer<typeof schema>>().toEqualTypeOf<
      '_type' | 'asset'
    >()
    expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<
      Infer<ReturnType<typeof image<{}>>>
    >()
  })
  test('fields must still be schemas', () => {
    // @ts-expect-error not a schema
    image({caption: 'foo'})
  })
  test('parsed image values include the asset schema on the reference', () => {
    const schema = image()

    expectTypeOf<Parsed<typeof schema>['asset']>().toEqualTypeOf<{
      _type: 'reference'
      _ref: string
      _weak?: boolean
      [REF_SCHEMA]: DocumentSchema<ImageAssetShape>
    }>()
  })
  test('custom image type definition', () => {
    const schema = image({
      caption: string(),
    })

    type ImageValue = {
      _type: 'image'
      asset: {
        _type: 'reference'
        _ref: string
        _weak?: boolean
      }
      caption: string
    }

    expectTypeOf<Infer<typeof schema>>().toEqualTypeOf<ImageValue>()
  })
})
