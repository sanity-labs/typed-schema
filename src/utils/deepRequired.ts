import {
  isDocumentSchema,
  isLazySchema,
  isObjectArraySchema,
  isObjectSchema,
  isObjectUnionSchema,
  isOptionalSchema,
} from '../asserters'
import {getUnkeyedSchema, objectArray} from '../creators/array'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {object} from '../creators/object'
import {union} from '../creators/union'
import {
  type OutputOf,
  type SanityDocument,
  type SanityLazy,
  type SanityObject,
  type SanityObjectArray,
  type SanityObjectShape,
  type SanityObjectType,
  type SanityObjectUnion,
  type SanityObjectUnionMemberKind,
  type SanityOptional,
  type SanityType,
} from '../defs'
import {inheritAnnotations} from '../helpers/annotations'
import {getLazySchema} from '../helpers/getLazySchema'

export type DeepRequiredShape<S> = S extends SanityObjectShape
  ? {
      [K in keyof S]: DeepRequired<S[K]>
    }
  : never

export type DeepRequiredPlain<T> = {
  [P in keyof T]-?: DeepRequiredPlain<T[P]>
}

export type DeepRequiredObject<S extends SanityObject | SanityDocument> =
  S extends SanityObject<infer Shape extends SanityObjectShape>
    ? SanityObjectShape extends Shape
      ? SanityObjectType<DeepRequiredPlain<OutputOf<S>>>
      : SanityObject<DeepRequiredShape<Shape>>
    : S extends SanityDocument<infer Shape extends SanityObjectShape>
      ? SanityDocument<DeepRequiredShape<Shape>>
      : never

export type DeepRequired<S extends SanityType> =
  S extends SanityOptional<infer T>
    ? DeepRequired<T>
    : S extends SanityLazy<infer T>
      ? SanityLazy<DeepRequired<T>>
      : S extends SanityObject | SanityDocument
        ? DeepRequiredObject<S>
        : S extends SanityObjectUnion<infer UnionTypes>
          ? SanityObjectUnion<
              Extract<DeepRequired<UnionTypes>, SanityObjectUnionMemberKind>
            >
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

// Cached by input schema, so transforming a recursive schema gives a recursive
// schema: resolving a transformed getter field returns the transformed schema
// it is part of, not a fresh copy at every level
const cache = new WeakMap<SanityType, SanityType>()

export function deepRequired<S extends SanityType>(schema: S): DeepRequired<S> {
  let result = cache.get(schema)
  if (result === undefined) {
    result = transform(schema)
    cache.set(schema, result)
  }
  return result as any
}

function transform(schema: SanityType): SanityType {
  if (isOptionalSchema(schema)) {
    return deepRequired(schema.type) as any
  }
  if (isLazySchema(schema)) {
    // Stays deferred, so recursive schemas don't recurse forever
    return inheritAnnotations(
      lazy(() => deepRequired(getLazySchema(schema))),
      schema,
      {examples: false},
    )
  }
  if (isDocumentSchema(schema)) {
    return inheritAnnotations(
      document(requiredShape(schema.shape) as any),
      schema,
      {examples: false},
    )
  }
  if (isObjectSchema(schema)) {
    return inheritAnnotations(object(requiredShape(schema.shape)), schema, {
      examples: false,
    })
  }
  if (isObjectUnionSchema(schema)) {
    return inheritAnnotations(
      union(schema.union.map(unionSchema => deepRequired(unionSchema)) as any),
      schema,
      {examples: false},
    )
  }
  if (isObjectArraySchema(schema)) {
    // Transform the schema the element was copied from, not the copy, so a
    // recursive element maps to the cached result it is part of
    return inheritAnnotations(
      objectArray(deepRequired(getUnkeyedSchema(schema.element)) as any),
      schema,
      {examples: false},
    )
  }
  return schema as any
}
