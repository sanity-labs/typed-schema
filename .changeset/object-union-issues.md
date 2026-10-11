---
'@sanity-labs/typed-schema': patch
---

When a value matches an object union member by `_type` but fails to parse, the error now lists only that member's issues, such as `[_key=="i1"].alt: Expected a string`. The extra `Cannot parse input as union type "…"` issue is gone. Before, it was added once for every level of union nesting, so it showed up twice for `portableText()` elements. `INVALID_OBJECT_UNION` is now reported only when the value has no `_type` or no member matches it.
