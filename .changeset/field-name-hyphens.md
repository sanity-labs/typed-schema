---
'@sanity-labs/typed-schema': minor
---

Field names can no longer contain hyphens, matching Sanity's naming rules: a field name starts with a letter A-Z and contains only letters A-Z, digits and underscores. Rename fields such as `'e-mail'` to `email`.

`extend()`, `image()` and `file()` now check field names the same way `object()` and `document()` do.

An invalid field name now gives a type error that says what is wrong, for example `SchemaError<"Field name 'e-mail' can only contain letters A-Z, digits and underscores">`, instead of `not assignable to type 'never'`.
