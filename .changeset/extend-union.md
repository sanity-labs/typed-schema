---
'@sanity-labs/typed-schema': minor
---

`extend()` accepts a `union()` of objects and adds the fields to every member, for example to give all the section types of a page builder an `anchor` field. The members keep their `_type` literals. A union with a `reference()`, `block()`, `image()` or `file()` member cannot be extended, and `_type` cannot be replaced on a union.
