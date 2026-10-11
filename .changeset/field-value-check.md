---
'@sanity-labs/typed-schema': minor
---

`object()`, `document()`, `image()`, `file()` and `extend()` now require every field to be a schema. A value such as `foo: 'bar'` is a type error, and creating the schema throws `Field "foo" is not a schema`. A field declared with a getter is checked the first time it is parsed.

`image()` and `file()` now accept fields declared with getters, so a recursive schema can refer to itself from inside an image or file field.
