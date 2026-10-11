# Loaders

| Export                             | Notes                                                                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createLoader(fetch)`              | `fetch: (id, fieldNames) => Promise<unknown>`. Returns `{loadDocument, loadDocuments, loadReference, loadReferences}`                                    |
| `createDocumentLoader(fetch)`      | Only `loadDocument`. It resolves to `Parsed<Committed<typeof Doc>>`                                                                                      |
| `createReferenceLoader(fetch)`     | Only `loadReference`. It resolves to `Parsed<Committed<typeof Target>>`, where `Target` is the schema the reference points to                            |
| `createLoadDocumentResult(fetch)`  | Like `createDocumentLoader`, but the loader resolves to a `parse` result instead of rejecting with a `ParseError`                                        |
| `createLoadReferenceResult(fetch)` | Like `createReferenceLoader`, but the loader resolves to a `parse` result, and takes an optional list of fields to fetch in place of the target schema's |

See [Loading documents and references](/guide/loaders) for an example with `@sanity/client`.
