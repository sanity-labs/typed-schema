import {type SanityReference, type SanityType} from '../defs'
import {defineType} from '../helpers/defineType'
import {ReferenceBase, type SanityDocumentValue} from '../shapeDefs'

export function reference<RefType extends SanityType<SanityDocumentValue>>(
  to: RefType,
): SanityReference<RefType> {
  return defineType({
    typeName: 'reference',
    referenceType: to,
    shape: ReferenceBase.shape,
  })
}
