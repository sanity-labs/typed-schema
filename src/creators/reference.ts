import {
  type OutputOf,
  type SanityDocumentKind,
  type SanityLazy,
  type SanityKind,
  type SanityReference,
  type SanityReferenceTarget,
  type SanityType,
  type SchemaAnnotations,
} from '../defs'
import {defineType} from '../helpers/defineType'
import {
  type AnnotationsError,
  type ReferenceTargetError,
} from '../helpers/schemaErrors'
import {type SchemaError} from '../helpers/utilTypes'
import {ReferenceBase, type SanityDocumentValue} from '../shapeDefs'

/** `unknown` if `T` has `typeName: string`, or is a `lazy()` of such a schema, otherwise `never` */
type AnnotatedSchema<T> =
  T extends SanityLazy<infer Inner>
    ? AnnotatedSchema<Inner>
    : T extends {typeName: infer Name}
      ? string extends Name
        ? unknown
        : never
      : never

// Separate overloads rather than one `SanityReferenceTarget` constraint:
// checking a union constraint reads the output of the referenced schema, which
// loops on documents that reference themselves through a getter. The first
// overload matches on `typeName` alone, so those documents never reach the
// others.
export function reference<RefType extends SanityDocumentKind>(
  to: RefType,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<SanityReference<RefType>>>>,
): SanityReference<RefType>
export function reference<RefType extends SanityLazy<SanityDocumentKind>>(
  to: RefType,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<SanityReference<RefType>>>>,
): SanityReference<RefType>
// A schema annotated by its value (`const Person: SanityType<Person> = ...`)
// has `typeName: string`. Requiring that, directly or inside `lazy()`, keeps
// out object schemas, whose output is also assignable to `SanityDocumentValue`
// when they have a `_type`.
export function reference<RefType extends SanityType<SanityDocumentValue>>(
  to: RefType & AnnotatedSchema<RefType>,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<SanityReference<RefType>>>>,
): SanityReference<RefType>
// Matches only what the overloads above reject, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the target. TypeScript 6 lists every overload's error,
// ending with this one.
export function reference<RefType extends SanityKind>(
  to: RefType & SchemaError<ReferenceTargetError<RefType>>,
  annotations?: AnnotationsError<'reference'>,
): never
export function reference(
  to: SanityReferenceTarget,
  annotations?: any,
): SanityReference<SanityReferenceTarget> {
  return defineType(
    {
      typeName: 'reference',
      referenceType: to,
      shape: ReferenceBase.shape,
    },
    annotations,
  )
}
