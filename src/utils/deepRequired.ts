import {
  isDocumentSchema,
  isObjectArraySchema,
  isObjectSchema,
  isObjectUnionSchema,
  isOptionalSchema,
} from '../asserters'
import {objectArray} from '../creators/array'
import {document} from '../creators/document'
import {object} from '../creators/object'
import {union} from '../creators/union'
import {
  type OutputOf,
  type SanityDocument,
  type SanityObject,
  type SanityObjectArray,
  type SanityObjectShape,
  type SanityObjectType,
  type SanityObjectUnion,
  type SanityOptional,
  type SanityType,
} from '../defs'

export type DeepRequiredShape<S> = S extends SanityObjectShape
  ? {
      [K in keyof S]: DeepRequired<S[K]>
    }
  : never

export type DeepRequiredPlain<T> = {
  [P in keyof T]-?: DeepRequiredPlain<T[P]>
}

export type DeepRequiredObject<S extends SanityObject | SanityDocument> =
  S extends SanityObject<infer Shape>
    ? SanityObjectShape extends Shape
      ? SanityObjectType<DeepRequiredPlain<OutputOf<S>>>
      : SanityObject<DeepRequiredShape<Shape>>
    : S extends SanityDocument<infer Shape>
      ? SanityDocument<DeepRequiredShape<Shape>>
      : never

export type DeepRequired<S extends SanityType> =
  S extends SanityOptional<infer T>
    ? DeepRequired<T>
    : S extends SanityObject | SanityDocument
      ? DeepRequiredObject<S>
      : S extends SanityObjectUnion<infer UnionTypes>
        ? SanityObjectUnion<DeepRequired<UnionTypes>>
        : S extends SanityObjectArray<infer ElementType>
          ? SanityObjectArray<DeepRequired<ElementType>>
          : S

function requiredShape(shape: SanityObjectShape): SanityObjectShape {
  return Object.fromEntries(
    Object.entries(shape).map(([key, propSchema]) => [
      key,
      deepRequired(propSchema),
    ]),
  )
}

export function deepRequired<S extends SanityType>(schema: S): DeepRequired<S> {
  if (isOptionalSchema(schema)) {
    return deepRequired(schema.type) as any
  }
  if (isDocumentSchema(schema)) {
    return document(requiredShape(schema.shape) as any) as any
  }
  if (isObjectSchema(schema)) {
    return object(requiredShape(schema.shape)) as any
  }
  if (isObjectUnionSchema(schema)) {
    return union(
      schema.union.map(unionSchema => deepRequired(unionSchema)) as any,
    ) as any
  }
  if (isObjectArraySchema(schema)) {
    return objectArray(deepRequired(schema.element) as any) as any
  }
  return schema as any
}
