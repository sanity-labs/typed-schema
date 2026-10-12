import {
  type DocumentSchema,
  type DocumentSchemaOf,
  type ObjectSchema,
  type ObjectSchemaOf,
  type ObjectShape,
  type OutputFromShape,
} from '../defs'
import {withoutExamples} from '../helpers/annotations'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
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
  Obj extends ObjectSchema | DocumentSchema,
  Augmentation extends {[key: string]: any},
> =
  Obj extends ObjectSchema<infer Shape>
    ? ObjectShape extends Shape
      ? ObjectSchemaOf<Combine<Obj['output'], OutputFromShape<Augmentation>>>
      : ObjectSchema<ExtendShape<Shape, Augmentation>>
    : Obj extends DocumentSchema<infer Shape>
      ? ObjectShape extends Shape
        ? DocumentSchemaOf<
            Combine<Obj['output'], OutputFromShape<Augmentation>>
          >
        : DocumentSchema<ExtendShape<Shape, Augmentation>>
      : never

export function extend<
  Obj extends ObjectSchema | DocumentSchema,
  // Not `ObjectShape`: checking the field types would read fields
  // declared with getters and break recursive extensions
  Shape extends {[key: string]: any},
>(
  source: Obj,
  shape: Shape &
    NoInfer<
      FieldErrors<Shape, Obj extends DocumentSchema ? '_id' | '_type' : '_type'>
    >,
): Extends<Obj, Shape> {
  const {annotations: _annotations, ...rest} = source
  // Through `defineType`, since a spread drops the non-enumerable `output` and
  // `~standard` properties of `source`
  return defineType(
    {...rest, shape: {...source.shape, ...deferGetters(shape)}},
    withoutExamples(source.annotations),
  ) as any
}
