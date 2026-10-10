import {isDocumentSchema, isObjectSchema, isOptionalSchema} from '../asserters'
import {document} from '../creators/document'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {
  type OutputOf,
  type SanityDocument,
  type SanityDocumentType,
  type SanityObject,
  type SanityObjectShape,
  type SanityObjectType,
} from '../defs'
import {type Combine} from '../helpers/utilTypes'
import {type MaybeOptionalType} from './deepPartial'

export type ShallowPartialShape<S> = S extends SanityObjectShape
  ? {
      [K in keyof S]: MaybeOptionalType<S[K]>
    }
  : never

export type ShallowPartial<S extends SanityObject | SanityDocument> =
  S extends SanityObject<infer Shape>
    ? SanityObjectShape extends Shape
      ? SanityObjectType<ShallowPartialPlain<OutputOf<S>>>
      : SanityObject<ShallowPartialShape<Shape>>
    : S extends SanityDocumentType<infer Shape>
      ? SanityDocument<ShallowPartialShape<Shape>>
      : never

export type ShallowPartialPlain<T> = T extends {_type: string}
  ? Combine<
      {[P in '_type']: T['_type']},
      {
        [P in keyof T as P extends '_type' ? never : P]?: T[P] | undefined
      }
    >
  : {[P in keyof T]?: T[P] | undefined}

export function shallowPartial<S extends SanityObject | SanityDocument>(
  schema: S,
): ShallowPartial<S> {
  if (!isObjectSchema(schema) && !isDocumentSchema(schema)) {
    throw new Error('Expected object or document schema')
  }
  const partialShape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, propSchema]) => [
      key,
      key === '_type' || isOptionalSchema(propSchema)
        ? propSchema
        : optional(propSchema),
    ]),
  )
  return (
    isDocumentSchema(schema)
      ? document(partialShape as any)
      : object(partialShape)
  ) as any
}
