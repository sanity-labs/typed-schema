---
'@sanity-labs/typed-schema': minor
---

Document lifecycle helpers now model completeness and persistence separately.

- Added `partial(doc)`. It makes every field except `_type` optional, recursively, and returns `DeepPartial<typeof doc>`.
- Renamed `stored()` to `committed()`, `Stored<T>` to `Committed<T>`, `STORED_KEYS` to `COMMITTED_KEYS` and `StoredKeys` to `CommittedKeys`.
- Removed `draft()` and `Draft<T>`. Use `partial()` and `DeepPartial<T>` instead.
- Removed `StoredDocument<T>`. Use `Infer<Committed<typeof Doc>>`.
- Removed `DeepPartialPlain<Value>`. Use `Infer<DeepPartial<typeof Obj>>`.
- Removed `InferReferenceType<Ref>`. Use `LoadedReference<Ref>` for what `loadReference` resolves to, or `ReferencedSchema<Ref>` for the target schema.
- `loadDocument`, `loadDocuments`, `loadReference` and `loadReferences` now parse against the committed schema, so a result without `_id`, `_rev`, `_createdAt` or `_updatedAt` rejects with a `ParseError`. Their results are typed `Parsed<Committed<typeof Doc>>`.
- The `fieldSelection` parameter of the safe reference loader is now typed as the target document's field names.
