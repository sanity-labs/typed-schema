import {isDocumentUnionSchema, isItemObjectArrayCompatible} from '../asserters'
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
import {defineType} from '../helpers/defineType'
import {getKeyedSchema} from '../helpers/keyedSchema'
import {
  type AnnotationsError,
  type ArrayElementError,
  type ObjectArrayElementError,
  type PrimitiveArrayElementError,
} from '../helpers/schemaErrors'
import {type SchemaError} from '../helpers/utilTypes'

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
      element: getKeyedSchema(elementSchema),
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
