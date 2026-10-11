---
'@sanity-labs/typed-schema': patch
---

Fix several runtime behaviours that disagreed with the static types:

- `parse` on an array of primitives now returns a failure for invalid elements instead of throwing
- `date()` validates the month (the format used `mm`, minutes, instead of `MM`)
- `dateTime()` accepts any ISO 8601 date-time with a zone designator, including values without milliseconds and with `±HH:mm` offsets
- `number()` constraints treat `0` as a real boundary, reject `NaN`/`Infinity`, and `safeint()`/`int32()`/`uint32()` reject non-integers
- `deepPartial()`, `deepRequired()`, `shallowPartial()` and `shallowRequired()` now work on documents; `shallowPartial()` made fields required instead of optional; `deepRequired()` now recurses into every field
- the document loader sends the document's field names as the field selection
- `inspect()` honours `maxDepth` and no longer overflows on circular input
