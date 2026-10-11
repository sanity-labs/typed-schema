import {type FieldSchemas, type InvalidFieldNames} from '../creators/object'
import {
  type OutputFromShape,
  type SanityDocument,
  type SanityDocumentType,
  type SanityObject,
  type SanityObjectShape,
  type SanityObjectType,
} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {type Combine, type Flatten} from '../helpers/utilTypes'

/**
 * The shape of `Shape` with the fields of `Augmentation` added or replaced.
 * A mapped type rather than {@link Combine}, so fields declared with getters
 * are not read and recursive extensions infer.
 */
type ExtendShape<Shape, Augmentation> = Flatten<
  Omit<Shape, keyof Augmentation> & Augmentation
>

export type Extends<
  Obj extends SanityObject | SanityDocument,
  Augmentation extends {[key: string]: any},
> =
  Obj extends SanityObject<infer Shape>
    ? SanityObjectShape extends Shape
      ? SanityObjectType<Combine<Obj['output'], OutputFromShape<Augmentation>>>
      : SanityObject<ExtendShape<Shape, Augmentation>>
    : Obj extends SanityDocument<infer Shape>
      ? SanityObjectShape extends Shape
        ? SanityDocumentType<
            Combine<Obj['output'], OutputFromShape<Augmentation>>
          >
        : SanityDocument<ExtendShape<Shape, Augmentation>>
      : never

export function extend<
  Obj extends SanityObject | SanityDocument,
  // Not `SanityObjectShape`: checking the field types would read fields
  // declared with getters and break recursive extensions
  Shape extends {[key: string]: any},
>(
  source: Obj,
  shape: Shape &
    NoInfer<
      InvalidFieldNames<
        Shape,
        Obj extends SanityDocument ? '_id' | '_type' : '_type'
      > &
        FieldSchemas<Shape>
    >,
): Extends<Obj, Shape> {
  return {...source, shape: {...source.shape, ...deferGetters(shape)}} as any
}
