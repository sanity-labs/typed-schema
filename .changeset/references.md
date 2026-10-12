---
'@sanity-labs/typed-schema': minor
---

A reference can point to several document types: `reference(union([Author, Book]))`. `loadReference()` parses the loaded document against the matching type, and the result can be narrowed on `_type`.

`union([reference(Author), reference(Book)])` now means the same thing. Previously, every reference value was parsed against the first reference in the union.
