import {
  isDocumentSchema,
  isDocumentUnionSchema,
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
  type DocumentSchema,
  type DocumentUnionMemberKind,
  type DocumentUnionSchema,
  type LazySchema,
  type ObjectArraySchema,
  type ObjectSchema,
  type ObjectSchemaOf,
  type ObjectShape,
  type ObjectUnionMemberKind,
  type ObjectUnionSchema,
  type OptionalSchema,
  type OutputOf,
  type Schema,
} from '../defs'
import {inheritAnnotations} from '../helpers/annotations'
import {getLazySchema} from '../helpers/getLazySchema'

export type DeepRequiredShape<S> = S extends ObjectShape
  ? {
      [K in keyof S]: DeepRequired<S[K]>
    }
  : never

export type DeepRequiredPlain<T> = {
  [P in keyof T]-?: DeepRequiredPlain<T[P]>
}

export type DeepRequiredObject<S extends ObjectSchema | DocumentSchema> =
  S extends ObjectSchema<infer Shape extends ObjectShape>
    ? ObjectShape extends Shape
      ? ObjectSchemaOf<DeepRequiredPlain<OutputOf<S>>>
      : ObjectSchema<DeepRequiredShape<Shape>>
    : S extends DocumentSchema<infer Shape extends ObjectShape>
      ? DocumentSchema<DeepRequiredShape<Shape>>
      : never

export type DeepRequired<S extends Schema> =
  S extends OptionalSchema<infer T>
    ? DeepRequired<T>
    : S extends LazySchema<infer T>
      ? LazySchema<DeepRequired<T>>
      : S extends ObjectSchema | DocumentSchema
        ? DeepRequiredObject<S>
        : S extends ObjectUnionSchema<infer UnionTypes>
          ? ObjectUnionSchema<
              Extract<DeepRequired<UnionTypes>, ObjectUnionMemberKind>
            >
          : S extends DocumentUnionSchema<infer UnionTypes>
            ? DocumentUnionSchema<
                Extract<DeepRequired<UnionTypes>, DocumentUnionMemberKind>
              >
            : S extends ObjectArraySchema<infer ElementType>
              ? ObjectArraySchema<DeepRequired<ElementType>>
              : S

function requiredShape(shape: ObjectShape): ObjectShape {
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
const cache = new WeakMap<Schema, Schema>()

export function deepRequired<S extends Schema>(schema: S): DeepRequired<S> {
  let result = cache.get(schema)
  if (result === undefined) {
    result = transform(schema)
    cache.set(schema, result)
  }
  return result as any
}

function transform(schema: Schema): Schema {
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
  if (isObjectUnionSchema(schema) || isDocumentUnionSchema(schema)) {
    return inheritAnnotations(
      union(
        (schema.union as Schema[]).map(unionSchema =>
          deepRequired(unionSchema),
        ) as any,
      ),
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
