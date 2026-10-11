---
'@sanity-labs/typed-schema': patch
---

`loadReference` and `loadReferences` now pass the referenced document's top-level field names to your fetch function, as `loadDocument` does. Previously they passed an empty list, so a fetch that projects the given fields, such as ``client.fetch(`*[_id == $id][0]{${fields.join(', ')}}`, {id})``, returned an empty object and the load failed. A reference without a known target schema passes the document system fields: `_type`, `_id`, `_createdAt`, `_updatedAt` and `_rev`.
