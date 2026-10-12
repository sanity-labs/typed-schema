import {isPrimitiveUnionSchema} from '../asserters'
import {
  type OutputOf,
  type DocumentKind,
  type LazySchema,
  type SchemaKind,
  type ReferenceSchema,
  type ReferenceTargets,
  type Schema,
  type SchemaAnnotations,
} from '../defs'
import {defineType} from '../helpers/defineType'
import {
  assertDistinctTargetTypes,
  assertDocumentTargets,
  listReferenceTargets,
} from '../helpers/referenceTargets'
import {
  type AnnotationsError,
  type ReferenceTargetError,
} from '../helpers/schemaErrors'
import {type SchemaError} from '../helpers/utilTypes'
import {type DocumentValue, ReferenceBase} from '../shapeDefs'

/** `unknown` if `T` has `typeName: string`, or is a `lazy()` of such a schema, otherwise `never` */
type AnnotatedSchema<T> =
  T extends LazySchema<infer Inner>
    ? AnnotatedSchema<Inner>
    : T extends {typeName: infer Name}
      ? string extends Name
        ? unknown
        : never
      : never

// Separate overloads rather than one `ReferenceTarget` constraint:
// checking a union constraint reads the output of the referenced schema, which
// loops on documents that reference themselves through a getter. The first
// overload matches on `typeName` alone, so those documents never reach the
// others.
export function reference<RefType extends DocumentKind>(
  to: RefType,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<ReferenceSchema<RefType>>>>,
): ReferenceSchema<RefType>
export function reference<RefType extends LazySchema<DocumentKind>>(
  to: RefType,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<ReferenceSchema<RefType>>>>,
): ReferenceSchema<RefType>
// A union of documents. A reference value does not say which type of
// document it points to, so `loadReference` picks the union member whose
// `_type` matches the loaded document. This overload matches on `typeName`
// alone and comes before the next one, because comparing a union's output
// would read the getters of a member that references itself while TypeScript
// is still inferring it, which fails as a circularity error.
export function reference<RefType extends Schema & {typeName: 'documentUnion'}>(
  to: RefType,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<ReferenceSchema<RefType>>>>,
): ReferenceSchema<RefType>
// A schema typed by its value (`const Person: Schema<Person> = ...`)
// has `typeName: string`. Requiring that, directly or inside `lazy()`, keeps
// out object schemas, whose output is also assignable to `DocumentValue`
// when they have a `_type`.
export function reference<RefType extends Schema<DocumentValue>>(
  to: RefType & AnnotatedSchema<RefType>,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<ReferenceSchema<RefType>>>>,
): ReferenceSchema<RefType>
// Matches only what the overloads above reject, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the target. TypeScript 6 lists every overload's error,
// ending with this one.
export function reference<RefType extends SchemaKind>(
  to: RefType & SchemaError<ReferenceTargetError<RefType>>,
  annotations?: AnnotationsError<'reference'>,
): never
export function reference(
  to: ReferenceTargets,
  annotations?: any,
): ReferenceSchema {
  // `union([])` is a primitive union at runtime, since it has no members
  if (isPrimitiveUnionSchema(to) && to.union.length === 0) {
    throw new Error(
      'reference() needs a union() with at least one document schema',
    )
  }
  const targets = listReferenceTargets(to)
  assertDocumentTargets(targets)
  assertDistinctTargetTypes(targets)
  return defineType(
    {
      typeName: 'reference',
      referenceType: to,
      shape: ReferenceBase.shape,
    },
    annotations,
  )
}
