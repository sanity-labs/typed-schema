---
'@sanity-labs/typed-schema': minor
---

`reference()` accepts several target documents, such as `reference([Author, Book])`. `loadReference` fetches the fields of every target and parses the loaded document against the target with a matching `_type`. If the loaded document has any other type, `loadReference` rejects with a `ParseError`. The result is typed as a union of the target documents, which you can narrow on `_type`. The targets must have different `_type` literals. `toClassicSchema` maps it to a classic reference with several `to` types.

A `union()` with more than one `reference()` member, such as `union([reference(Author), reference(Book)])`, is now a type error, and `union()` throws for it at runtime. Such a union could not tell its references apart: every value parsed as the first one, so `loadReference` loaded it against the wrong document schema. Use `reference([Author, Book])` instead.
