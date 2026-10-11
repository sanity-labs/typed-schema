import {
  type OutputOf,
  type SanityDocument,
  type SanityObjectShape,
  type SchemaAnnotations,
  type WithDocumentShape,
} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {
  type FieldErrors,
  type RequireTypeField,
  type SystemFieldErrors,
} from '../helpers/schemaErrors'
import {DocumentBase} from '../shapeDefs'

/**
 * The `shape` parameter of `document()`. A named alias so a type error shows
 * `DocumentShapeInput<...>` rather than the checks it is made of, and the
 * missing `_type` check is a member of its own so the error goes straight to
 * its message.
 */
type DocumentShapeInput<Shape> = Shape &
  NoInfer<RequireTypeField<Shape>> &
  NoInfer<FieldErrors<Shape, '_id' | '_type'> & SystemFieldErrors<Shape>>

export function document<
  Shape extends {[key: string]: any} = SanityObjectShape,
>(
  shape: DocumentShapeInput<Shape>,
  annotations?: NoInfer<
    SchemaAnnotations<OutputOf<SanityDocument<WithDocumentShape<Shape>>>>
  >,
): SanityDocument<WithDocumentShape<Shape>> {
  return defineType(
    {
      typeName: 'document',
      shape: {...DocumentBase.shape, ...deferGetters(shape)},
    },
    annotations,
  ) as any
}
