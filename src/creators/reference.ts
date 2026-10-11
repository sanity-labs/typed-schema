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
import {assertDistinctTargetTypes} from '../helpers/referenceTargets'
import {
  type AnnotationsError,
  type CheckReferenceTargets,
  type NoTargets,
  type ReferenceTargetErrors,
} from '../helpers/schemaErrors'
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
// Several targets. A reference value does not say which type of document it
// points to, so `loadReference` picks the target by the `_type` of the
// document it loads. Documents and lazy documents are accepted by the type
// constraint alone, without `CheckReferenceTargets`, because checking would
// resolve a lazy target while a self-referencing document is still being
// inferred. Schemas typed by their value (`const Person: SanityType<Person> =
// ...`) fall through to the next overload, which checks each target.
export function reference<
  const Targets extends readonly (
    | SanityDocumentKind
    | SanityLazy<SanityDocumentKind>
  )[],
>(
  to: Targets & NoInfer<Targets extends readonly [] ? NoTargets : unknown>,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<SanityReference<Targets>>>>,
): SanityReference<Targets>
export function reference<const Targets extends readonly SanityKind[]>(
  to: Targets & NoInfer<CheckReferenceTargets<Targets>>,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<SanityReference<Targets>>>>,
): SanityReference<Targets>
// Matches only what the overloads above reject, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the target. TypeScript 6 lists every overload's error,
// ending with this one.
export function reference<
  const RefType extends SanityKind | readonly SanityKind[],
>(
  to: RefType & NoInfer<ReferenceTargetErrors<RefType>>,
  annotations?: AnnotationsError<'reference'>,
): never
export function reference(
  to: SanityReferenceTarget | readonly SanityReferenceTarget[],
  annotations?: any,
): SanityReference<SanityReferenceTarget | readonly SanityReferenceTarget[]> {
  if (Array.isArray(to)) {
    if (to.length === 0) {
      throw new Error('reference() needs at least one target document schema')
    }
    assertDistinctTargetTypes(to)
  }
  return defineType(
    {
      typeName: 'reference',
      referenceType: to,
      shape: ReferenceBase.shape,
    },
    annotations,
  )
}
