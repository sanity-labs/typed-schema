---
'@sanity-labs/typed-schema': minor
---

New schema types and options:

- `enums()` for a fixed set of values: `enums(['draft', 'published'])`.
- `number()` takes `min`, `max`, `gt`, `lt` and `step` constraints, and `safeint()`, `int32()`, `uint32()`, `float32()` and `float64()` are added.
- `image()` and `file()` can be called without arguments.
