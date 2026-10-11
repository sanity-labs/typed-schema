import {document} from '../creators/document'
import {object} from '../creators/object'
import {
  type OutputOf,
  type SanityDocument,
  type SanityDocumentType,
  type SanityObject,
  type SanityObjectShape,
  type SanityObjectType,
} from '../defs'
import {type ElementType, type Format} from '../helpers/utilTypes'

export type OmitObjectLike<
  T extends SanityObject | SanityDocument,
  K extends Array<keyof OutputOf<T>>,
> =
  T extends SanityObject<infer Shape extends SanityObjectShape>
    ? SanityObjectShape extends Shape
      ? SanityObjectType<Format<Omit<OutputOf<T>, ElementType<K>>>>
      : SanityObject<Format<Omit<Shape, ElementType<K>>>>
    : T extends SanityDocument<infer Shape extends SanityObjectShape>
      ? SanityObjectShape extends Shape
        ? SanityDocumentType<Format<Omit<OutputOf<T>, ElementType<K>>>>
        : SanityDocument<Format<Omit<Shape, ElementType<K>>>>
      : never

export function omit<
  T extends SanityObject | SanityDocument,
  K extends Array<keyof OutputOf<T>>,
>(type: T, keys: K): OmitObjectLike<T, K> {
  const shape = Object.fromEntries(
    Object.entries(type.shape).filter(([key]) => !keys.includes(key)),
  )
  return (
    type.typeName === 'object' ? object(shape) : document(shape as any)
  ) as any
}
