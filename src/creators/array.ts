import {
  isItemObjectArrayCompatible,
  isNeverSchema,
  isObjectUnionSchema,
} from '../asserters'
import {
  type OutputOf,
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
  type SchemaAnnotations,
} from '../defs'
import {withoutExamples} from '../helpers/annotations'
import {defineType} from '../helpers/defineType'
import {
  type AnnotationsError,
  type ArrayElementError,
  type ObjectArrayElementError,
  type PrimitiveArrayElementError,
} from '../helpers/schemaErrors'
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
  // The copy keeps the annotations, except `examples`: those are values of
  // the schema without `_key`, which `validateExamples` checks through
  // `getUnkeyedSchema`. Built through `defineType`, since a spread drops the
  // non-enumerable `output` and `~standard` properties of `schema`
  const {annotations: _annotations, ...rest} = schema
  const withKey = defineType(
    isObjectUnionSchema(schema)
      ? {
          ...rest,
          union: schema.union.map(unionType =>
            isNeverSchema(unionType) ? unionType : addKeyProperty(unionType),
          ),
        }
      : {...rest, shape: {...schema.shape, _key: string()}},
    withoutExamples(schema.annotations),
  )
  keyedFrom.set(withKey, getUnkeyedSchema(schema))
  return withKey as SanityType as T
}

export function objectArray<
  ElementType extends SanityObjectLikeKind | SanityObjectUnionKind,
>(
  elementSchema: ElementType,
  annotations?: NoInfer<
    SchemaAnnotations<OutputOf<SanityObjectArray<ElementType>>>
  >,
): SanityObjectArray<ElementType>
// Matches only what the overload above rejects, see `array()`
export function objectArray<ElementType extends SanityKind>(
  elementSchema: ElementType &
    SchemaError<ObjectArrayElementError<ElementType>>,
  annotations?: AnnotationsError<'objectArray'>,
): never
export function objectArray(
  elementSchema: SanityObjectLikeKind | SanityObjectUnionKind,
  annotations?: any,
): SanityType {
  return defineType(
    {
      typeName: 'objectArray',
      element: addKeyProperty(elementSchema),
    },
    annotations,
  )
}

export function primitiveArray<
  ElementType extends
    | SanityPrimitive
    | SanityLiteral
    | SanityPrimitiveUnion
    | SanityNever,
>(
  elementSchema: ElementType,
  annotations?: NoInfer<
    SchemaAnnotations<OutputOf<SanityPrimitiveArray<ElementType>>>
  >,
): SanityPrimitiveArray<ElementType>
// Matches only what the overload above rejects, see `array()`
export function primitiveArray<ElementType extends SanityKind>(
  elementSchema: ElementType &
    SchemaError<PrimitiveArrayElementError<ElementType>>,
  annotations?: AnnotationsError<'primitiveArray'>,
): never
export function primitiveArray(
  elementSchema:
    | SanityPrimitive
    | SanityLiteral
    | SanityPrimitiveUnion
    | SanityNever,
  annotations?: any,
): SanityType {
  return defineType(
    {typeName: 'primitiveArray', element: elementSchema},
    annotations,
  )
}

export function array<Def extends SanityObjectLikeKind | SanityObjectUnionKind>(
  elementSchema: Def,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<SanityObjectArray<Def>>>>,
): SanityObjectArray<Def>
export function array<Def extends SanityPrimitive | SanityPrimitiveUnion>(
  elementSchema: Def,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<SanityPrimitiveArray<Def>>>>,
): SanityPrimitiveArray<Def>
export function array<Def extends SanityNever>(
  elementSchema: Def,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<SanityPrimitiveArray<Def>>>>,
): SanityPrimitiveArray<Def>
// For generic code whose element type may be either object-like or primitive.
// Last, so concrete calls resolve to the specific overloads above
export function array<
  Def extends
    | SanityObjectLikeKind
    | SanityObjectUnionKind
    | SanityPrimitive
    | SanityPrimitiveUnion,
>(
  elementSchema: Def,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<SanityArray<Def>>>>,
): SanityArray<Def>
// Matches only what the overloads above reject, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the element schema. TypeScript 6 lists every overload's
// error, ending with this one.
export function array<Def extends SanityKind>(
  elementSchema: Def & SchemaError<ArrayElementError<Def>>,
  annotations?: AnnotationsError<'array'>,
): never
export function array(
  elementSchema:
    | SanityObjectLike
    | SanityObjectUnion
    | SanityPrimitive
    | SanityNever
    | SanityPrimitiveUnion,
  annotations?: any,
) {
  return isItemObjectArrayCompatible(elementSchema)
    ? objectArray(elementSchema, annotations)
    : primitiveArray(elementSchema, annotations)
}
