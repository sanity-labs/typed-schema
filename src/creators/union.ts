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
  type SanityAsset,
  type SanityBlock,
  type SanityKind,
  type SanityLiteral,
  type SanityNever,
  type SanityObjectUnion,
  type SanityPrimitive,
  type SanityPrimitiveUnion,
  type SanityReference,
  type SanityType,
  type SanityTypedObject,
} from '../defs'
import {defineType} from '../helpers/defineType'
import {type CheckUnionMembers} from '../helpers/schemaErrors'

export type FlattenUnionTypes<
  T extends
    | SanityNever
    | SanityTypedObject
    | SanityReference
    | SanityObjectUnion<any>
    | SanityBlock
    | SanityAsset,
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
  UnionTypes extends
    | SanityNever
    | SanityTypedObject
    | SanityReference
    | SanityBlock
    | SanityAsset
    | SanityObjectUnion<any>,
>(unionTypes: UnionTypes[]): SanityObjectUnion<FlattenUnionTypes<UnionTypes>>
export function union<
  UnionTypes extends
    | SanityNever
    | SanityPrimitive
    | SanityLiteral
    | SanityPrimitiveUnion<any>,
>(
  unionTypes: UnionTypes[],
): SanityPrimitiveUnion<FlattenPrimitiveUnionTypes<UnionTypes>>
// Matches only what the overloads above reject, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the members. TypeScript 6 lists every overload's error,
// ending with this one.
export function union<const Members extends readonly SanityKind[]>(
  unionTypes: Members & NoInfer<CheckUnionMembers<Members>>,
): never
export function union(unionTypes: SanityType[]): unknown {
  if (
    unionTypes.every(
      schema =>
        isLiteralSchema(schema) ||
        isPrimitiveSchema(schema) ||
        isNeverSchema(schema) ||
        isPrimitiveUnionSchema(schema),
    )
  ) {
    return defineType({
      typeName: 'primitiveUnion',
      union: unionTypes.filter(schema => !isNeverSchema(schema)),
    })
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
    return defineType({
      typeName: 'union',
      union: unionTypes.filter(schema => !isNeverSchema(schema)),
    })
  }

  throw new Error(
    'Union types must either be of primitive values or typed objects',
  )
}
