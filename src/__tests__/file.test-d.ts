import {describe, expectTypeOf, test} from 'vitest'

import {file} from '../creators/file'
import {string} from '../creators/string'
import {
  type Infer,
  type Parsed,
  type REF_SCHEMA,
  type SanityDocument,
} from '../defs'
import {type FileAssetShape} from '../shapeDefs'

describe('file type', () => {
  test('plain file type definition', () => {
    const FileSchema = file({})

    type FileValue = {
      _type: 'file'
      asset: {
        _type: 'reference'
        _ref: string
        _weak?: boolean
      }
    }

    expectTypeOf<Infer<typeof FileSchema>>().toEqualTypeOf<FileValue>()
  })
  test('parsed file values include the asset schema on the reference', () => {
    const FileSchema = file({})

    expectTypeOf<Parsed<typeof FileSchema>['asset']>().toEqualTypeOf<{
      _type: 'reference'
      _ref: string
      _weak?: boolean
      [REF_SCHEMA]: SanityDocument<FileAssetShape>
    }>()
  })
  test('custom file type definition', () => {
    const FileSchema = file({
      caption: string(),
    })

    type FileValue = {
      _type: 'file'
      asset: {
        _type: 'reference'
        _ref: string
        _weak?: boolean
      }
      caption: string
    }

    expectTypeOf<Infer<typeof FileSchema>>().toEqualTypeOf<FileValue>()
  })
})
