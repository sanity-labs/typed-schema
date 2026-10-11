import {describe, expectTypeOf, test} from 'vitest'

import {image} from '../creators/image'
import {string} from '../creators/string'
import {
  type Infer,
  type Parsed,
  type REF_SCHEMA,
  type SanityDocument,
} from '../defs'
import {type ImageAssetShape} from '../shapeDefs'

describe('image type', () => {
  test('plain image type definition', () => {
    const ImageSchema = image()

    type ImageValue = {
      _type: 'image'
      asset: {
        _type: 'reference'
        _ref: string
        _weak?: boolean
      }
    }

    expectTypeOf<Infer<typeof ImageSchema>>().toEqualTypeOf<ImageValue>()
  })
  test('without a shape, the output has no extra keys', () => {
    const ImageSchema = image()

    expectTypeOf<keyof Infer<typeof ImageSchema>>().toEqualTypeOf<
      '_type' | 'asset'
    >()
    expectTypeOf<Infer<typeof ImageSchema>>().toEqualTypeOf<
      Infer<ReturnType<typeof image<{}>>>
    >()
  })
  test('fields must still be schemas', () => {
    // @ts-expect-error not a schema
    image({caption: 'foo'})
  })
  test('parsed image values include the asset schema on the reference', () => {
    const ImageSchema = image()

    expectTypeOf<Parsed<typeof ImageSchema>['asset']>().toEqualTypeOf<{
      _type: 'reference'
      _ref: string
      _weak?: boolean
      [REF_SCHEMA]: SanityDocument<ImageAssetShape>
    }>()
  })
  test('custom image type definition', () => {
    const ImageSchema = image({
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

    expectTypeOf<Infer<typeof ImageSchema>>().toEqualTypeOf<ImageValue>()
  })
})
