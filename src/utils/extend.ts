import {
  type OutputFromShape,
  type SanityDocument,
  type SanityDocumentType,
  type SanityObject,
  type SanityObjectShape,
  type SanityObjectType,
} from '../defs'
import {withoutExamples} from '../helpers/annotations'
import {deferGetters} from '../helpers/deferGetters'
import {type FieldErrors} from '../helpers/schemaErrors'
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
      FieldErrors<Shape, Obj extends SanityDocument ? '_id' | '_type' : '_type'>
    >,
): Extends<Obj, Shape> {
  const {annotations: _annotations, ...rest} = source
  const annotations = withoutExamples(source.annotations)
  return {
    ...rest,
    shape: {...source.shape, ...deferGetters(shape)},
    ...(annotations && {annotations}),
  } as any
}
