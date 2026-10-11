---
'@sanity-labs/typed-schema': minor
---

`parse` now returns a result instead of throwing, and `parseOrThrow` is the throwing variant.

- `parse(schema, input)` returns `{ok: true, value}` or `{ok: false, error}`, where `error` is a `ParseError`. It replaces `safeParse`, which is removed. Code that relied on `parse` throwing should call `parseOrThrow` instead.
- `parseOrThrow(schema, input)` returns the parsed value or throws the same `ParseError` a failed `parse` result holds.
- `ParseError.errors` is now `ParseError.issues`, and the item type `ParseErrorDetails` is now `ParseIssue`.
- Issues inside keyed object arrays are now addressed by `{_key, index}` path segments instead of the bare key string: the item's `_key` and its index in the input array. Items of primitive arrays keep their numeric index.
- Added `formatPath(path)`, which renders a path the way Sanity writes them: `body[_key=="abc"].children[0].text`. `ParseError.message` uses it.
- An `ARRAY_ELEMENT_NOT_KEYED_OBJECT` issue now reports the offending item as `input`, not the whole array.
