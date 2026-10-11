---
'@sanity-labs/typed-schema': patch
---

Passing a schema that is not a document to `reference()` is now a type error. Previously, `reference()` also accepted an `object()` with a `_type` literal and a schema annotated as `SanityObjectType<Value>`. It still accepts `document()` schemas, schemas annotated as `SanityType<Value>` or `SanityDocumentType<Value>` where `Value` extends `SanityDocumentValue`, and `lazy()` wrappers of either.
