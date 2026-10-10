import {
  type OutputFromShape,
  type SanityDocument,
  type SanityLiteral,
  type SanityObjectShape,
  type SanityString,
  type UndefinedOptional,
} from '../defs'
import {defineType} from '../helpers/defineType'
import {type Format} from '../helpers/utilTypes'
import {DocumentBase, type SanityDocumentShape} from '../shapeDefs'
import {type SafeObject} from './object'

export function document<Shape extends SanityObjectShape = SanityObjectShape>(
  shape: SafeObject<Shape, '_id' | '_type'> & {
    _id?: SanityLiteral<string> | SanityString
    _type: SanityLiteral<string>
  },
): SanityDocument<
  Format<Shape & SanityDocumentShape>,
  UndefinedOptional<OutputFromShape<SanityDocumentShape & Shape>>
> {
  return defineType({
    typeName: 'document',
    shape: {...DocumentBase.shape, ...shape},
  }) as any
}
