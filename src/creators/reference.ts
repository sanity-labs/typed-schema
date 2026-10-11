import {
  type SanityDocumentKind,
  type SanityLazy,
  type SanityReference,
  type SanityReferenceTarget,
  type SanityType,
} from '../defs'
import {defineType} from '../helpers/defineType'
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
): SanityReference<RefType>
export function reference<RefType extends SanityLazy<SanityDocumentKind>>(
  to: RefType,
): SanityReference<RefType>
// A schema annotated by its value (`const Person: SanityType<Person> = ...`)
// has `typeName: string`. Requiring that, directly or inside `lazy()`, keeps
// out object schemas, whose output is also assignable to `SanityDocumentValue`
// when they have a `_type`.
export function reference<RefType extends SanityType<SanityDocumentValue>>(
  to: RefType & AnnotatedSchema<RefType>,
): SanityReference<RefType>
export function reference(
  to: SanityReferenceTarget,
): SanityReference<SanityReferenceTarget> {
  return defineType({
    typeName: 'reference',
    referenceType: to,
    shape: ReferenceBase.shape,
  })
}
