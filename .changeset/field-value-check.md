---
'@sanity-labs/typed-schema': minor
---

`object()`, `document()`, `image()`, `file()` and `extend()` now require every field to be a schema. A value such as `foo: 'bar'` is a type error that names the field, `SchemaError<"Field 'foo' is not a schema">`, and creating the schema throws `Field "foo" is not a schema`. A field declared with a getter is checked the first time it is parsed.

`image()` and `file()` now accept fields declared with getters, so a recursive schema can refer to itself from inside an image or file field.

`image()` and `file()` no longer need an argument when there are no extra fields: write `image()` instead of `image({})`.
