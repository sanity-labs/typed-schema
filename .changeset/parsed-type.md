---
'@sanity-labs/typed-schema': minor
---

`Infer<>` now describes the data as stored, and the new `Parsed<>` describes what `parse()` returns. Parsed references include the referenced schema as `$refSchema` (previously `__schema__`). If you read the schema off a reference, type the value with `Parsed<>` instead of `Infer<>`.
