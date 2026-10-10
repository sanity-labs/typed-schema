import {createLoader} from './createLoader'

const fetchImpl = (_id: string, _selection: string[]) =>
  Promise.reject(new Error('This is a stubbed `fetch` for demo purposes only'))

const {loadReference, loadDocument, loadReferences, loadDocuments} =
  createLoader(fetchImpl)

export {loadDocument, loadDocuments, loadReference, loadReferences}
