# Modifiers and transforms

## Modifiers

| Function             | Notes                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------- |
| `optional(schema)`   | The field may be `undefined` or absent. See [`optional()`](/api/schema-types#optional) |
| `required(schema)`   | Removes `optional()`, however many times it was applied                                |
| `lazy(() => schema)` | Defers a schema until it is parsed. See [`lazy()`](/api/schema-types#lazy)             |

## Schema transforms

Each returns a new schema. Types follow the runtime change. See [Composing schemas](/guide/composing) and [Partial and required variants](/guide/partial-and-required) for examples.

| Function                  | Notes                                                                      |
| ------------------------- | -------------------------------------------------------------------------- |
| `extend(schema, shape)`   | Adds or replaces fields; on a `union()` of objects, every member gets them |
| `omit(schema, keys)`      | Removes fields. Document system fields are kept                            |
| `pick(schema, keys)`      | Keeps only the listed fields (plus system fields on documents)             |
| `rename(schema, newType)` | Replaces the `_type` literal                                               |
| `shallowPartial(schema)`  | Top-level fields optional                                                  |
| `shallowRequired(schema)` | Top-level fields required                                                  |
| `deepPartial(schema)`     | All fields optional, recursively                                           |
| `deepRequired(schema)`    | All fields required, recursively                                           |
