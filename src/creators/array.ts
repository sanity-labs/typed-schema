import {
  isDocumentUnionSchema,
  isItemObjectArrayCompatible,
  isNeverSchema,
  isObjectUnionSchema,
} from '../asserters'
import {
  type ArraySchema,
  type LiteralSchema,
  type NeverSchema,
  type ObjectArraySchema,
  type ObjectLikeKind,
  type ObjectLikeSchema,
  type ObjectUnionKind,
  type ObjectUnionSchema,
  type OutputOf,
  type PrimitiveArraySchema,
  type PrimitiveSchema,
  type PrimitiveUnionSchema,
  type Schema,
  type SchemaAnnotations,
  type SchemaKind,
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
const keyedFrom = new WeakMap<Schema, Schema>()

/**
 * Returns the schema an object array element was copied from, or the schema
 * itself if it is not an array element
 */
export function getUnkeyedSchema(schema: Schema): Schema {
  return keyedFrom.get(schema) ?? schema
}

function addKeyProperty<T extends ObjectLikeKind | ObjectUnionKind>(
  target: T,
): T {
  const schema = target as Schema as ObjectUnionSchema | ObjectLikeSchema
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
  return withKey as Schema as T
}

export function objectArray<
  ElementType extends ObjectLikeKind | ObjectUnionKind,
>(
  elementSchema: ElementType,
  annotations?: NoInfer<
    SchemaAnnotations<OutputOf<ObjectArraySchema<ElementType>>>
  >,
): ObjectArraySchema<ElementType>
// Matches only what the overload above rejects, see `array()`
export function objectArray<ElementType extends SchemaKind>(
  elementSchema: ElementType &
    SchemaError<ObjectArrayElementError<ElementType>>,
  annotations?: AnnotationsError<'objectArray'>,
): never
export function objectArray(
  elementSchema: ObjectLikeKind | ObjectUnionKind,
  annotations?: any,
): Schema {
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
    | PrimitiveSchema
    | LiteralSchema
    | PrimitiveUnionSchema
    | NeverSchema,
>(
  elementSchema: ElementType,
  annotations?: NoInfer<
    SchemaAnnotations<OutputOf<PrimitiveArraySchema<ElementType>>>
  >,
): PrimitiveArraySchema<ElementType>
// Matches only what the overload above rejects, see `array()`
export function primitiveArray<ElementType extends SchemaKind>(
  elementSchema: ElementType &
    SchemaError<PrimitiveArrayElementError<ElementType>>,
  annotations?: AnnotationsError<'primitiveArray'>,
): never
export function primitiveArray(
  elementSchema:
    | PrimitiveSchema
    | LiteralSchema
    | PrimitiveUnionSchema
    | NeverSchema,
  annotations?: any,
): Schema {
  return defineType(
    {typeName: 'primitiveArray', element: elementSchema},
    annotations,
  )
}

export function array<Def extends ObjectLikeKind | ObjectUnionKind>(
  elementSchema: Def,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<ObjectArraySchema<Def>>>>,
): ObjectArraySchema<Def>
export function array<Def extends PrimitiveSchema | PrimitiveUnionSchema>(
  elementSchema: Def,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<PrimitiveArraySchema<Def>>>>,
): PrimitiveArraySchema<Def>
export function array<Def extends NeverSchema>(
  elementSchema: Def,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<PrimitiveArraySchema<Def>>>>,
): PrimitiveArraySchema<Def>
// For generic code whose element type may be either object-like or primitive.
// Last, so concrete calls resolve to the specific overloads above
export function array<
  Def extends
    | ObjectLikeKind
    | ObjectUnionKind
    | PrimitiveSchema
    | PrimitiveUnionSchema,
>(
  elementSchema: Def,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<ArraySchema<Def>>>>,
): ArraySchema<Def>
// Matches only what the overloads above reject, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the element schema. TypeScript 6 lists every overload's
// error, ending with this one.
export function array<Def extends SchemaKind>(
  elementSchema: Def & SchemaError<ArrayElementError<Def>>,
  annotations?: AnnotationsError<'array'>,
): never
export function array(
  elementSchema:
    | ObjectLikeSchema
    | ObjectUnionSchema
    | PrimitiveSchema
    | NeverSchema
    | PrimitiveUnionSchema,
  annotations?: any,
) {
  if (isDocumentUnionSchema(elementSchema)) {
    throw new Error(
      'array() elements cannot be a union() of documents. For references to several document types, use array(reference(union([...])))',
    )
  }
  return isItemObjectArrayCompatible(elementSchema)
    ? objectArray(elementSchema, annotations)
    : primitiveArray(elementSchema, annotations)
}
