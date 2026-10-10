---
'@sanity-labs/typed-schema': minor
---

Portable Text blocks and arrays of object-like types now parse correctly:

- `array()` of a `reference()`, `image()`, `file()`, `block()`, or a union containing any of these (including nested unions) is now a keyed object array: `_key` is required and kept, matching the static type. Previously these were treated as primitive arrays.
- `block()` values can be parsed. The block shape now matches what Sanity stores: `style`, `listItem` (previously typed as `listType`), `level` and `markDefs` are optional; span `marks` is `string[]` (decorator names and `markDefs` keys). Unconfigured `style`/`listItem` accept any string.
- `union()` accepts `date()` and `dateTime()` members, as the types already allowed.
- References parse against their own shape, so a reference inside an array keeps its `_key`.
- Resolved `lazy()` schemas are cached in a `WeakMap`; schema objects stay JSON-serializable after parsing, and nested `lazy()` resolves, including in `loadDocument`.
