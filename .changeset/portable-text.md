---
'@sanity-labs/typed-schema': minor
---

Portable Text improvements:

- `block()` values can now be parsed, and the block type matches what Sanity stores. `listType` is renamed to `listItem`, and `style`, `listItem`, `level` and `markDefs` are optional.
- Images, files and references can be used directly as inline objects, annotations and `portableText()` elements, without wrapping them in an object.
- Arrays of references, images, files and blocks are keyed arrays: `_key` is required and kept when parsing.
- `block()` takes a single type parameter, the type of its options, so a block's type is now `BlockSchema<BlockObjectShape<{style: ...}>>`. `BlockObjectShape` takes the same options type. Replace `BlockObjectShape<Style, List, Inline, Decorator, Annotation, TypeName>` with `BlockObjectShape<{style: Style, list: List}>`, and leave out any option you passed as `NeverSchema`. `BlockOptions` is no longer generic.
