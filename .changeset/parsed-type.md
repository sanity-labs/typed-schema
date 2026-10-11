---
'@sanity-labs/typed-schema': minor
---

Add `Parsed<T>`, the type that `parse`, `safeParse` and the document loaders return.

Reference values returned by `parse` now include the referenced document's schema as `$refSchema` instead of `__schema__`. Only `Parsed<>` has the key: `Infer<>` describes stored data and no longer includes it, so a reference you write by hand or fetch from the client typechecks without it. Code that reads the schema off an `Infer<>` value should use `Parsed<>` instead. The exported constant `INTERNAL_REF_TYPE_SCHEMA` is now `REF_SCHEMA`.
