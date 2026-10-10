import {describe, expectTypeOf, test} from 'vitest'

import {image} from '../creators/image'
import {string} from '../creators/string'
import {
  type Infer,
  type INTERNAL_REF_TYPE_SCHEMA,
  type SanityDocument,
} from '../defs'
import {type ImageAssetShape} from '../shapeDefs'

describe('image type', () => {
  test('plain image type definition', () => {
    const ImageSchema = image({})

    type ImageValue = {
      _type: 'image'
      asset: {
        _type: 'reference'
        _ref: string
        _weak?: boolean
        [INTERNAL_REF_TYPE_SCHEMA]: SanityDocument<ImageAssetShape>
      }
    }

    expectTypeOf<Infer<typeof ImageSchema>>().toEqualTypeOf<ImageValue>()
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
        [INTERNAL_REF_TYPE_SCHEMA]: SanityDocument<ImageAssetShape>
      }
      caption: string
    }

    expectTypeOf<Infer<typeof ImageSchema>>().toEqualTypeOf<ImageValue>()
  })
})
