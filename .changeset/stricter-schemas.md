---
'@sanity-labs/typed-schema': minor
---

Invalid schemas are caught earlier, and type errors now say what is wrong, for example `SchemaError<"Field name 'e-mail' can only contain letters A-Z, digits and underscores">`.

- Field names can no longer contain hyphens, matching Sanity. Rename fields like `'e-mail'` to `email`.
- Every field must be a schema. A plain value such as `foo: 'bar'` is a type error and throws at runtime.
- `reference()` accepts only document schemas.
