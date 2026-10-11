---
'@sanity-labs/typed-schema': minor
---

Add `Parsed<T>`, the type that `parse`, `safeParse` and the document loaders return. `Infer<T>` now describes stored data only, so references in it no longer include `$refSchema`. Code that reads `$refSchema` off an `Infer<>` value should use `Parsed<>` instead.
