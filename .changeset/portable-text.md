---
'@sanity-labs/typed-schema': minor
---

Portable Text improvements:

- `block()` values can now be parsed, and the block type matches what Sanity stores. `listType` is renamed to `listItem`, and `style`, `listItem`, `level` and `markDefs` are optional.
- Images, files and references can be used directly as inline objects, annotations and `portableText()` elements, without wrapping them in an object.
- Arrays of references, images, files and blocks are keyed arrays: `_key` is required and kept when parsing.
