import {
  isItemObjectArrayCompatible,
  isNeverSchema,
  isObjectUnionSchema,
} from '../asserters'
import {
  type SanityLiteral,
  type SanityNever,
  type SanityObjectArray,
  type SanityObjectLike,
  type SanityObjectLikeKind,
  type SanityObjectUnion,
  type SanityObjectUnionKind,
  type SanityPrimitive,
  type SanityPrimitiveArray,
  type SanityPrimitiveUnion,
  type SanityType,
} from '../defs'
import {defineType} from '../helpers/defineType'
import {string} from './string'

function addKeyProperty<T extends SanityObjectLikeKind | SanityObjectUnionKind>(
  target: T,
): T {
  const schema = target as SanityType as SanityObjectUnion | SanityObjectLike
  const withKey = isObjectUnionSchema(schema)
    ? {
        ...schema,
        union: schema.union.map(unionType =>
          isNeverSchema(unionType) ? unionType : addKeyProperty(unionType),
        ),
      }
    : {...schema, shape: {...schema.shape, _key: string()}}
  return withKey as SanityType as T
}

export function objectArray<
  ElementType extends SanityObjectLikeKind | SanityObjectUnionKind,
>(elementSchema: ElementType): SanityObjectArray<ElementType> {
  return defineType({
    typeName: 'objectArray',
    element: addKeyProperty(elementSchema),
  })
}

export function primitiveArray<
  ElementType extends
    | SanityPrimitive
    | SanityLiteral
    | SanityPrimitiveUnion
    | SanityNever,
>(elementSchema: ElementType): SanityPrimitiveArray<ElementType> {
  return defineType({typeName: 'primitiveArray', element: elementSchema})
}

export function array<Def extends SanityObjectLikeKind | SanityObjectUnionKind>(
  elementSchema: Def,
): SanityObjectArray<Def>
export function array<Def extends SanityPrimitive | SanityPrimitiveUnion>(
  elementSchema: Def,
): SanityPrimitiveArray<Def>
export function array<Def extends SanityNever>(
  elementSchema: Def,
): SanityPrimitiveArray<Def>
export function array(
  elementSchema:
    | SanityObjectLike
    | SanityObjectUnion
    | SanityPrimitive
    | SanityNever
    | SanityPrimitiveUnion,
) {
  return isItemObjectArrayCompatible(elementSchema)
    ? objectArray(elementSchema)
    : primitiveArray(elementSchema)
}
