import {isDocumentSchema, isObjectSchema, isOptionalSchema} from '../asserters'
import {document} from '../creators/document'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {
  type DocumentSchema,
  type DocumentSchemaOf,
  type ObjectSchema,
  type ObjectSchemaOf,
  type ObjectShape,
  type OutputOf,
} from '../defs'
import {inheritAnnotations} from '../helpers/annotations'
import {type Combine} from '../helpers/utilTypes'
import {type MaybeOptionalType} from './deepPartial'

export type ShallowPartialShape<S> = S extends ObjectShape
  ? {
      [K in keyof S]: K extends '_type' ? S[K] : MaybeOptionalType<S[K]>
    }
  : never

export type ShallowPartial<S extends ObjectSchema | DocumentSchema> =
  S extends ObjectSchema<infer Shape extends ObjectShape>
    ? ObjectShape extends Shape
      ? ObjectSchemaOf<ShallowPartialPlain<OutputOf<S>>>
      : ObjectSchema<ShallowPartialShape<Shape>>
    : S extends DocumentSchema<infer Shape extends ObjectShape>
      ? ObjectShape extends Shape
        ? DocumentSchemaOf<ShallowPartialPlain<OutputOf<S>>>
        : DocumentSchema<ShallowPartialShape<Shape>>
      : never

export type ShallowPartialPlain<T> = T extends {_type: string}
  ? Combine<
      {[P in '_type']: T['_type']},
      {
        [P in keyof T as P extends '_type' ? never : P]?: T[P] | undefined
      }
    >
  : {[P in keyof T]?: T[P] | undefined}

export function shallowPartial<S extends ObjectSchema | DocumentSchema>(
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
  return inheritAnnotations(
    isDocumentSchema(schema)
      ? document(partialShape as any)
      : object(partialShape),
    schema,
  ) as any
}
