---
'@sanity-labs/typed-schema': patch
---

Passing a schema that is not a document to `reference()` is now a type error. Previously, `reference()` also accepted an `object()` with a `_type` literal and a schema typed as `SanityObjectType<Value>`. It still accepts `document()` schemas, schemas typed as `SanityType<Value>` or `SanityDocumentType<Value>` where `Value` extends `SanityDocumentValue`, and `lazy()` wrappers of these. `reference()` also throws if a target is not a document at runtime, such as an `object()` typed as `SanityType<Value>`.
