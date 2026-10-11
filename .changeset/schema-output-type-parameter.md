---
'@sanity-labs/typed-schema': minor
---

`SanityObject`, `SanityDocument`, `SanityBlock`, `SanityImage` and `SanityFile` no longer take a second `Output` type parameter; the output type is always computed from the shape. To annotate a schema by its value type, use `SanityObjectType<Value>` or `SanityDocumentType<Value>`, which keep the schema's `typeName`, or `SanityType<Value>` for any schema.
