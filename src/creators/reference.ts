import {
  type SanityDocumentKind,
  type SanityReference,
  type SanityReferenceTarget,
  type SanityType,
} from '../defs'
import {defineType} from '../helpers/defineType'
import {ReferenceBase, type SanityDocumentValue} from '../shapeDefs'

// Two overloads rather than one `SanityReferenceTarget` constraint: checking
// a union constraint reads the output of the referenced schema, which loops
// on documents that reference themselves through a getter. The first overload
// matches on `typeName` alone.
export function reference<RefType extends SanityDocumentKind>(
  to: RefType,
): SanityReference<RefType>
export function reference<RefType extends SanityType<SanityDocumentValue>>(
  to: RefType,
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
