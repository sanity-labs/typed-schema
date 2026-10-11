---
'@sanity-labs/typed-schema': minor
---

Every schema now implements [Standard Schema](https://standardschema.dev), so it can be passed to any library that accepts one. `schema['~standard'].validate(input)` runs `parse` and returns `{value}` or `{issues}`; an issue's path addresses a keyed array item as `{key: index, _key}`, so it resolves against the input; `StandardSchemaV1.InferInput` is the value as stored (`Infer`) and `StandardSchemaV1.InferOutput` is what `parse` returns (`Parsed`). The property is not enumerable, so schemas remain plain, serializable data. The `StandardSchemaV1` type is exported for code that does not depend on `@standard-schema/spec`.
