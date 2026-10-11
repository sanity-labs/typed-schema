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
import {optional} from '../creators/optional'
import {union} from '../creators/union'
import {
  type OutputOf,
  type SanityDocument,
  type SanityDocumentUnion,
  type SanityDocumentUnionMemberKind,
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
import {type Combine, type ExtendsNever} from '../helpers/utilTypes'

export type MaybeOptionalType<T extends SanityType> =
  T extends SanityOptional<any> ? T : SanityOptional<T>

export type PartialShape<
  S extends SanityObjectShape,
  Except extends keyof S = never,
> = {
  [K in keyof S]: ExtendsNever<Except> extends true
    ? MaybeOptionalType<DeepPartial<S[K]>>
    : K extends Except
      ? DeepPartial<S[K]>
      : MaybeOptionalType<DeepPartial<S[K]>>
}

/**
 * Value-level counterpart of {@link DeepPartial}, used where a schema carries
 * no shape to transform (`SanityObjectType<Value>`). Not exported: express a
 * partial value as `Infer<DeepPartial<typeof Obj>>`.
 */
type DeepPartialValue<T> = T extends {_type: string}
  ? Combine<
      {[P in '_type']: T['_type']},
      {
        [P in keyof T as P extends '_type' ? never : P]?: DeepPartialValue<T[P]>
      }
    >
  : {[P in keyof T]?: DeepPartialValue<T[P]>}

export type DeepPartialObject<S extends SanityObject | SanityDocument> =
  S extends SanityObject<infer Shape extends SanityObjectShape>
    ? SanityObjectShape extends Shape
      ? SanityObjectType<DeepPartialValue<OutputOf<S>>>
      : SanityObject<PartialShape<Shape, '_type'>>
    : S extends SanityDocument<infer Shape extends SanityObjectShape>
      ? SanityDocument<PartialShape<Shape, '_type'>>
      : never

export type DeepPartial<S extends SanityType> =
  S extends SanityOptional<any>
    ? S
    : S extends SanityLazy<infer T>
      ? SanityLazy<DeepPartial<T>>
      : S extends SanityObject | SanityDocument
        ? DeepPartialObject<S>
        : S extends SanityObjectUnion<infer UnionTypes>
          ? SanityObjectUnion<
              Extract<DeepPartial<UnionTypes>, SanityObjectUnionMemberKind>
            >
          : S extends SanityDocumentUnion<infer UnionTypes>
            ? SanityDocumentUnion<
                Extract<DeepPartial<UnionTypes>, SanityDocumentUnionMemberKind>
              >
            : S extends SanityObjectArray<infer ElementType>
              ? SanityObjectArray<DeepPartial<ElementType>>
              : S

function partialShape(shape: SanityObjectShape): SanityObjectShape {
  return Object.fromEntries(
    Object.entries(shape).map(([key, propSchema]) => [
      key,
      key === '_type' || isOptionalSchema(propSchema)
        ? deepPartial(propSchema)
        : optional(deepPartial(propSchema)),
    ]),
  )
}

// Cached by input schema, so transforming a recursive schema gives a recursive
// schema: resolving a transformed getter field returns the transformed schema
// it is part of, not a fresh copy at every level
const cache = new WeakMap<SanityType, SanityType>()

export function deepPartial<S extends SanityType>(schema: S): DeepPartial<S> {
  let result = cache.get(schema)
  if (result === undefined) {
    result = transform(schema)
    cache.set(schema, result)
  }
  return result as any
}

function transform(schema: SanityType): SanityType {
  if (isOptionalSchema(schema)) {
    return optional(deepPartial(schema.type)) as any
  }
  if (isLazySchema(schema)) {
    // Stays deferred, so recursive schemas don't recurse forever
    return inheritAnnotations(
      lazy(() => deepPartial(getLazySchema(schema))),
      schema,
    )
  }
  if (isDocumentSchema(schema)) {
    return inheritAnnotations(
      document(partialShape(schema.shape) as any),
      schema,
    )
  }
  if (isObjectSchema(schema)) {
    return inheritAnnotations(object(partialShape(schema.shape)), schema)
  }
  if (isObjectUnionSchema(schema) || isDocumentUnionSchema(schema)) {
    return inheritAnnotations(
      union(
        (schema.union as SanityType[]).map(unionSchema =>
          deepPartial(unionSchema),
        ) as any,
      ),
      schema,
    )
  }
  if (isObjectArraySchema(schema)) {
    // Transform the schema the element was copied from, not the copy, so a
    // recursive element maps to the cached result it is part of
    return inheritAnnotations(
      objectArray(deepPartial(getUnkeyedSchema(schema.element)) as any),
      schema,
    )
  }
  return schema as any
}
