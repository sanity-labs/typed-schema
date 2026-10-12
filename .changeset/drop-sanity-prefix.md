---
'@sanity-labs/typed-schema': minor
---

Type names no longer start with `Sanity`:

- Schema types end in `Schema` instead: `SanityString` is now `StringSchema`, `SanityDocument` is `DocumentSchema`, and so on. `SanityType<Output>` is now `Schema<Output>`, and `SanityAny` is removed in favor of `Schema`.
- Shape and value types drop the prefix: `SanityObjectShape` is now `ObjectShape`, `SanityDocumentValue` is `DocumentValue`, and so on.
- To type a schema by its value, use `ObjectSchemaOf<Value>` or `DocumentSchemaOf<Value>` (previously `SanityObjectType` and `SanityDocumentType`). `ObjectSchema`, `DocumentSchema`, `ImageSchema`, `FileSchema` and `BlockSchema` no longer take an `Output` type parameter.
- `SANITY_ASSET`, `SANITY_OBJECT_LIKE` and `SANITY_EXTENDABLE_OBJECT` are now `ASSET_TYPE_NAMES`, `OBJECT_LIKE_TYPE_NAMES` and `EXTENDABLE_OBJECT_TYPE_NAMES`.
