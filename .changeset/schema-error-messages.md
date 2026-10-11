---
'@sanity-labs/typed-schema': patch
---

Type errors for these invalid schemas now say what is wrong, for example `SchemaError<"array() elements cannot be arrays. Wrap the inner array in an object">`, instead of `not assignable to type 'never'` or an error about an unrelated overload:

- a document `_type` that is missing or not a string literal, or an `_id` that is not a string
- `array()` elements that are arrays or `optional()`
- unions that mix primitives and objects, or include an object without a `_type` literal
- a `reference()` to a primitive schema, such as `reference(string())`
- invalid `block()` options
- `objectArray()` and `primitiveArray()` elements of the wrong kind
