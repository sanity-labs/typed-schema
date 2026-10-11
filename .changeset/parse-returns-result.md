---
'@sanity-labs/typed-schema': minor
---

`parse` now returns a result instead of throwing, and `parseOrThrow` is the throwing variant.

- `parse(schema, input)` returns `{ok: true, value}` or `{ok: false, error}`, where `error` is a `ParseError`. It replaces `safeParse`, which is removed. Code that relied on `parse` throwing should call `parseOrThrow` instead.
- `parseOrThrow(schema, input)` returns the parsed value or throws the same `ParseError` a failed `parse` result holds.
- `ParseError.errors` is now `ParseError.issues`, the item type `ParseErrorDetails` is now `ParseIssue`, and `ParseError.name` is `'ParseError'`.
- Issues can include the rejected value as `input`: pass `{reportInput: true}` as the third argument to `parse` or `parseOrThrow`. It is off by default so that error messages and logged issues do not leak untrusted or sensitive input. Strings from the input that appear in a message, such as a `_key` or `_type`, are escaped and cut at 80 characters.
- Issues inside keyed object arrays are now addressed by `{_key, index}` path segments instead of the bare key string: the item's `_key` and its index in the input array. Items of primitive arrays keep their numeric index.
- Added `formatPath(path)`, which renders a path the way Sanity writes them: `body[_key=="abc"].children[0].text`.
- Added `formatIssues(issues)`, which renders a list of issues as a readable report: one line per issue with its path, message and the rejected value. It takes `ParseError.issues` or the `issues` of any Standard Schema `validate` result, and shows the rejected value only for issues that have an `input`. `ParseError.message` is now this report, so it lists every issue instead of summarising the first.
