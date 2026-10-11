---
'@sanity-labs/typed-schema': minor
---

Reference values returned by `parse` now carry the referenced document's schema as `$refSchema` instead of `__schema__`, and the key is optional in `Infer<>`. A reference you write by hand or fetch from the client typechecks without it. The exported constant `INTERNAL_REF_TYPE_SCHEMA` is now `REF_SCHEMA`.
