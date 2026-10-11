import {
  isDocumentSchema,
  isLazySchema,
  isObjectArraySchema,
  isObjectSchema,
  isObjectUnionSchema,
  isOptionalSchema,
} from '../asserters'
import {objectArray} from '../creators/array'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
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

export function deepPartial<S extends SanityType>(schema: S): DeepPartial<S> {
  if (isOptionalSchema(schema)) {
    return optional(deepPartial(schema.type)) as any
  }
  if (isLazySchema(schema)) {
    // Stays deferred, so recursive schemas don't recurse forever
    return lazy(() => deepPartial(getLazySchema(schema))) as any
  }
  if (isDocumentSchema(schema)) {
    return document(partialShape(schema.shape) as any) as any
  }
  if (isObjectSchema(schema)) {
    return object(partialShape(schema.shape)) as any
  }
  if (isObjectUnionSchema(schema)) {
    return union(
      schema.union.map(unionSchema => deepPartial(unionSchema)) as any,
    ) as any
  }
  if (isObjectArraySchema(schema)) {
    return objectArray(deepPartial(schema.element) as any) as any
  }
  return schema as any
}
