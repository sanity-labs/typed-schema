import {createLoader} from '@sanity-labs/typed-schema'

// A loader with a stubbed fetch, for the examples in this folder. In a real
// app the fetch implementation would run a GROQ query, e.g. with
// @sanity/client: `client.fetch('*[_id == $id][0]{' + fields.join(',') + '}', {id})`
export const {loadDocument, loadDocuments, loadReference, loadReferences} =
  createLoader(async (id, fieldSelection) => {
    throw new Error(
      `Stubbed fetch for demo purposes: would fetch "${id}" with fields ${fieldSelection.join(', ')}`,
    )
  })
