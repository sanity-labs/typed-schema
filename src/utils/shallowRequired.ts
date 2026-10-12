import {isDocumentSchema, isObjectSchema} from '../asserters'
import {document} from '../creators/document'
import {object} from '../creators/object'
import {
  type _DocumentSchema,
  type DocumentSchema,
  type ObjectSchema,
  type ObjectSchemaOf,
  type ObjectShape,
  type OutputOf,
} from '../defs'
import {inheritAnnotations} from '../helpers/annotations'
import {type DocumentShape} from '../shapeDefs'
import {required, type RequiredSchema} from './required'

export type ShallowRequiredShape<S> = S extends ObjectShape
  ? {
      [K in keyof S]: RequiredSchema<S[K]>
    }
  : never

export type ShallowRequired<S extends ObjectSchema | DocumentSchema> =
  S extends ObjectSchema<infer Shape extends ObjectShape>
    ? ObjectShape extends Shape
      ? ObjectSchemaOf<Required<OutputOf<S>>>
      : ObjectSchema<ShallowRequiredShape<Shape>>
    : S extends _DocumentSchema<infer Shape extends DocumentShape>
      ? DocumentSchema<ShallowRequiredShape<Shape>>
      : never

export function shallowRequired<S extends ObjectSchema | DocumentSchema>(
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
  return inheritAnnotations(
    isDocumentSchema(schema)
      ? document(requiredShape as any)
      : object(requiredShape),
    schema,
    {examples: false},
  ) as any
}
