import {
  isAssetSchema,
  isLiteralSchema,
  isNeverSchema,
  isObjectUnionSchema,
  isPrimitiveSchema,
  isPrimitiveUnionSchema,
  isReferenceSchema,
  isTypedObjectSchema,
} from '../asserters'
import {
  type OutputOf,
  type SanityKind,
  type SanityLiteral,
  type SanityNever,
  type SanityObjectUnion,
  type SanityObjectUnionMemberKind,
  type SanityPrimitive,
  type SanityPrimitiveUnion,
  type SanityType,
  type SchemaAnnotations,
} from '../defs'
import {defineType} from '../helpers/defineType'
import {
  type AnnotationsError,
  type CheckUnionMembers,
} from '../helpers/schemaErrors'

export type FlattenUnionTypes<
  T extends SanityObjectUnionMemberKind | SanityObjectUnion<any>,
> =
  T extends SanityObjectUnion<infer UnionTypes>
    ? UnionTypes extends SanityObjectUnion<any>
      ? FlattenUnionTypes<UnionTypes>
      : Exclude<UnionTypes, SanityNever>
    : T

export type FlattenPrimitiveUnionTypes<
  T extends
    | SanityPrimitive
    | SanityLiteral
    | SanityPrimitiveUnion<any>
    | SanityNever,
> =
  T extends SanityPrimitiveUnion<infer UnionTypes>
    ? UnionTypes extends SanityPrimitiveUnion<any>
      ? FlattenPrimitiveUnionTypes<UnionTypes>
      : UnionTypes
    : T

export function union<
  UnionTypes extends SanityObjectUnionMemberKind | SanityObjectUnion<any>,
>(
  unionTypes: UnionTypes[],
  annotations?: NoInfer<
    SchemaAnnotations<
      OutputOf<SanityObjectUnion<FlattenUnionTypes<UnionTypes>>>
    >
  >,
): SanityObjectUnion<FlattenUnionTypes<UnionTypes>>
export function union<
  UnionTypes extends
    | SanityNever
    | SanityPrimitive
    | SanityLiteral
    | SanityPrimitiveUnion<any>,
>(
  unionTypes: UnionTypes[],
  annotations?: NoInfer<
    SchemaAnnotations<
      OutputOf<SanityPrimitiveUnion<FlattenPrimitiveUnionTypes<UnionTypes>>>
    >
  >,
): SanityPrimitiveUnion<FlattenPrimitiveUnionTypes<UnionTypes>>
// Matches only what the overloads above reject, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the members. TypeScript 6 lists every overload's error,
// ending with this one.
export function union<const Members extends readonly SanityKind[]>(
  unionTypes: Members & NoInfer<CheckUnionMembers<Members>>,
  annotations?: AnnotationsError<'union'>,
): never
export function union(unionTypes: SanityType[], annotations?: any): unknown {
  if (
    unionTypes.every(
      schema =>
        isLiteralSchema(schema) ||
        isPrimitiveSchema(schema) ||
        isNeverSchema(schema) ||
        isPrimitiveUnionSchema(schema),
    )
  ) {
    return defineType(
      {
        typeName: 'primitiveUnion',
        union: unionTypes.filter(schema => !isNeverSchema(schema)),
      },
      annotations,
    )
  }

  if (
    unionTypes.every(
      schema =>
        isTypedObjectSchema(schema) ||
        isObjectUnionSchema(schema) ||
        isReferenceSchema(schema) ||
        isNeverSchema(schema) ||
        isAssetSchema(schema),
    )
  ) {
    return defineType(
      {
        typeName: 'union',
        union: unionTypes.filter(schema => !isNeverSchema(schema)),
      },
      annotations,
    )
  }

  throw new Error(
    'Union types must either be of primitive values or typed objects',
  )
}
