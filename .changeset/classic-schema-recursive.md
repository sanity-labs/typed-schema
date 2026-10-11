---
'@sanity-labs/typed-schema': patch
---

`toClassicSchema()` now converts fields declared with a getter or `lazy()` instead of dropping them. A recursive object type is emitted as a named top-level type after the document, and fields refer to it by its `_type` name, so pass the whole returned array to your Studio config. `toClassicSchema()` throws if a recursive object type has no `_type` literal, or if two different object types have the same `_type` and one of them is recursive or nested in the other.
