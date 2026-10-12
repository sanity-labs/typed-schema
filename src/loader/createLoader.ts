import {type DocumentSchemaOf, type Parsed, type Schema} from '../defs'
import {type ElementType} from '../helpers/utilTypes'
import {type Committed} from '../lifecycle'
import {type DocumentValue} from '../shapeDefs'
import {createDocumentLoader, type MaybeLazy} from './createDocumentLoader'
import {
  createReferenceLoader,
  type LoadedReference,
  type ReferenceWithOptionalRefType,
} from './createReferenceLoader'

export function createLoader(
  fetchImpl: (id: string, fieldSelection: string[]) => Promise<unknown>,
) {
  const loadDocument = createDocumentLoader(fetchImpl)
  const loadReference = createReferenceLoader(fetchImpl)

  function loadReferences<
    RefArray extends Array<ReferenceWithOptionalRefType<Schema<DocumentValue>>>,
  >(references: RefArray): Promise<LoadedReference<ElementType<RefArray>>[]> {
    return Promise.all(references.map(loadReference)) as any
  }

  function loadDocuments<
    DocumentSchema extends DocumentSchemaOf<DocumentValue>,
  >(
    schema: MaybeLazy<DocumentSchema>,
    ids: string[],
  ): Promise<Parsed<Committed<DocumentSchema>>[]> {
    return Promise.all(ids.map(id => loadDocument(schema, id)))
  }

  return {loadDocument, loadDocuments, loadReference, loadReferences}
}
