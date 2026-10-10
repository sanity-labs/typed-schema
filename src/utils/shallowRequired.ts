import {isDocumentSchema, isObjectSchema} from '../asserters'
import {document} from '../creators/document'
import {object} from '../creators/object'
import {
  type _SanityDocument,
  type OutputOf,
  type SanityDocument,
  type SanityObject,
  type SanityObjectShape,
  type SanityObjectType,
} from '../defs'
import {required, type SanityRequired} from './required'

export type ShallowRequiredShape<S> = S extends SanityObjectShape
  ? {
      [K in keyof S]: SanityRequired<S[K]>
    }
  : never

export type ShallowRequired<S extends SanityObject | SanityDocument> =
  S extends SanityObject<infer Shape>
    ? SanityObjectShape extends Shape
      ? SanityObjectType<Required<OutputOf<S>>>
      : SanityObject<ShallowRequiredShape<Shape>>
    : S extends _SanityDocument<infer Shape>
      ? SanityDocument<ShallowRequiredShape<Shape>>
      : never

export function shallowRequired<S extends SanityObject | SanityDocument>(
  schema: S,
): ShallowRequired<S> {
  if (!isObjectSchema(schema) && !isDocumentSchema(schema)) {
    throw new Error('Expected object or document schema')
  }
  const requiredShape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, propSchema]) => [
      key,
      required(propSchema),
    ]),
  )
  return (
    isDocumentSchema(schema)
      ? document(requiredShape as any)
      : object(requiredShape)
  ) as any
}
