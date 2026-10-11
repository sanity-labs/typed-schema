---
'@sanity-labs/typed-schema': minor
---

Every schema now implements [Standard Schema](https://standardschema.dev) through `schema['~standard']`, so it can be passed to any library that accepts one. `validate(input)` returns `{value}` or `{issues}`, and the property is not enumerable, so schemas remain plain, serializable data.
