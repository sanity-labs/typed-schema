import {
  type SanityDocument,
  type SanityLiteral,
  type SanityObjectShape,
  type SanityString,
  type WithDocumentShape,
} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {DocumentBase} from '../shapeDefs'
import {type FieldSchemas, type InvalidFieldNames} from './object'

export function document<
  Shape extends {[key: string]: any} = SanityObjectShape,
>(
  shape: Shape &
    NoInfer<InvalidFieldNames<Shape, '_id' | '_type'> & FieldSchemas<Shape>> & {
      _id?: SanityLiteral<string> | SanityString
      _type: SanityLiteral<string>
    },
): SanityDocument<WithDocumentShape<Shape>> {
  return defineType({
    typeName: 'document',
    shape: {...DocumentBase.shape, ...deferGetters(shape)},
  }) as any
}
