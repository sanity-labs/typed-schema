---
'@sanity-labs/typed-schema': minor
---

Exported types no longer start with `Sanity`:

- Schema types swap the prefix for a `Schema` suffix: `SanityString` is now `StringSchema`, `SanityDocument` is `DocumentSchema`, `SanityObjectUnion` is `ObjectUnionSchema`, and so on. `SanityRequired` is `RequiredSchema`.
- `SanityType<Output>` is now `Schema<Output>`. `SanityAny` is removed; use `Schema`.
- `SanityObjectType<Value>` and `SanityDocumentType<Value>` are now `ObjectSchemaOf<Value>` and `DocumentSchemaOf<Value>`.
- Shape and value types drop the prefix: `SanityObjectShape` is now `ObjectShape`, `SanityDocumentValue` is `DocumentValue`, `SanityReferenceValue` is `ReferenceValue`, `SanityArrayValue` is `ArrayValue`, and so on.
- The `typeName` lists `SANITY_ASSET`, `SANITY_OBJECT_LIKE` and `SANITY_EXTENDABLE_OBJECT` are now `ASSET_TYPE_NAMES`, `OBJECT_LIKE_TYPE_NAMES` and `EXTENDABLE_OBJECT_TYPE_NAMES`.
