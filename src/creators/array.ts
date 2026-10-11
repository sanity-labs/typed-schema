import {
  isItemObjectArrayCompatible,
  isNeverSchema,
  isObjectUnionSchema,
} from '../asserters'
import {
  type SanityArray,
  type SanityKind,
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
import {type ArrayElementError} from '../helpers/schemaErrors'
import {type SchemaError} from '../helpers/utilTypes'
import {string} from './string'

// Object array elements are copies of the given schema with `_key` added. This
// maps each copy back to the schema it was made from, kept off-object like the
// `getLazySchema` cache, so schema walkers can tell one schema reused in
// several places from two declarations of the same type
const keyedFrom = new WeakMap<SanityType, SanityType>()

/**
 * Returns the schema an object array element was copied from, or the schema
 * itself if it is not an array element
 */
export function getUnkeyedSchema(schema: SanityType): SanityType {
  return keyedFrom.get(schema) ?? schema
}

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
  keyedFrom.set(withKey, getUnkeyedSchema(schema))
  return withKey as SanityType as T
}

export function objectArray<
  ElementType extends SanityObjectLikeKind | SanityObjectUnionKind,
>(elementSchema: ElementType): SanityObjectArray<ElementType>
// Matches only what the overload above rejects, see `array()`
export function objectArray<ElementType extends SanityKind>(
  elementSchema: ElementType &
    SchemaError<'objectArray() elements must be objects, references, blocks, images, files or unions of these'>,
): never
export function objectArray(
  elementSchema: SanityObjectLikeKind | SanityObjectUnionKind,
): SanityType {
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
>(elementSchema: ElementType): SanityPrimitiveArray<ElementType>
// Matches only what the overload above rejects, see `array()`
export function primitiveArray<ElementType extends SanityKind>(
  elementSchema: ElementType &
    SchemaError<'primitiveArray() elements must be primitives, literals or unions of these'>,
): never
export function primitiveArray(
  elementSchema:
    | SanityPrimitive
    | SanityLiteral
    | SanityPrimitiveUnion
    | SanityNever,
): SanityType {
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
// For generic code whose element type may be either object-like or primitive.
// Last, so concrete calls resolve to the specific overloads above
export function array<
  Def extends
    | SanityObjectLikeKind
    | SanityObjectUnionKind
    | SanityPrimitive
    | SanityPrimitiveUnion,
>(elementSchema: Def): SanityArray<Def>
// Matches only what the overloads above reject, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the element schema. TypeScript 6 lists every overload's
// error, ending with this one.
export function array<Def extends SanityKind>(
  elementSchema: Def & SchemaError<ArrayElementError<Def>>,
): never
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
