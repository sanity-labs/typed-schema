---
'@sanity-labs/typed-schema': minor
---

`ObjectSchema`, `DocumentSchema`, `BlockSchema`, `ImageSchema` and `FileSchema` no longer take a second `Output` type parameter; the output type is always computed from the shape. To annotate a schema by its value type, use `ObjectSchemaOf<Value>` or `DocumentSchemaOf<Value>`, which keep the schema's `typeName`, or `Schema<Value>` for any schema.
