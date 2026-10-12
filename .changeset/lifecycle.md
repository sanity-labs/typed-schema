---
'@sanity-labs/typed-schema': minor
---

Document lifecycle helpers are renamed:

- `stored()` is now `committed()`, and `Stored<T>` is now `Committed<T>`.
- `draft()` is replaced by `partial()`, and `Draft<T>` by `DeepPartial<T>`.
- `StoredDocument<T>` is removed. Use `Infer<Committed<typeof Doc>>`.

The document and reference loaders now reject results that lack `_id`, `_rev`, `_createdAt` or `_updatedAt`.
