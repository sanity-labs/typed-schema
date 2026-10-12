---
'@sanity-labs/typed-schema': minor
---

`parse()` now returns a result instead of throwing. Use `parseOrThrow()` if you want the old behavior.

- `parse(schema, input)` returns `{ok: true, value}` or `{ok: false, error}`. `safeParse()` is removed.
- `ParseError.errors` is renamed to `ParseError.issues`, and `ParseError.message` lists every issue.
- New `formatIssues()` and `formatPath()` print issues and paths the way Sanity writes them, such as `body[_key=="abc"].children[0].text`.
- Pass `{reportInput: true}` to include the rejected value in each issue. It is off by default to avoid leaking input into logs.
