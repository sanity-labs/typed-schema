import {document} from '../creators/document'
import {object} from '../creators/object'
import {
  type DocumentSchema,
  type DocumentSchemaOf,
  type ObjectSchema,
  type ObjectSchemaOf,
  type ObjectShape,
  type OutputOf,
} from '../defs'
import {inheritAnnotations} from '../helpers/annotations'
import {type ElementType, type Format} from '../helpers/utilTypes'

export type OmitObjectLike<
  T extends ObjectSchema | DocumentSchema,
  K extends Array<keyof OutputOf<T>>,
> =
  T extends ObjectSchema<infer Shape extends ObjectShape>
    ? ObjectShape extends Shape
      ? ObjectSchemaOf<Format<Omit<OutputOf<T>, ElementType<K>>>>
      : ObjectSchema<Format<Omit<Shape, ElementType<K>>>>
    : T extends DocumentSchema<infer Shape extends ObjectShape>
      ? ObjectShape extends Shape
        ? DocumentSchemaOf<Format<Omit<OutputOf<T>, ElementType<K>>>>
        : DocumentSchema<Format<Omit<Shape, ElementType<K>>>>
      : never

export function omit<
  T extends ObjectSchema | DocumentSchema,
  K extends Array<keyof OutputOf<T>>,
>(type: T, keys: K): OmitObjectLike<T, K> {
  const shape = Object.fromEntries(
    Object.entries(type.shape).filter(([key]) => !keys.includes(key)),
  )
  return inheritAnnotations(
    type.typeName === 'object' ? object(shape) : document(shape as any),
    type,
  ) as any
}
