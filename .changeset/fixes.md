---
'@sanity-labs/typed-schema': patch
---

Bug fixes:

- `date()` validates the month, and `dateTime()` accepts any ISO 8601 date-time with a time zone.
- `number()` rejects `NaN` and `Infinity`.
- `parse()` on an array of invalid primitives returns an error instead of throwing.
- `deepPartial()`, `deepRequired()`, `shallowPartial()` and `shallowRequired()` work on documents, and `shallowPartial()` makes fields optional instead of required.
- The document and reference loaders pass the document's field names to your fetch function.
- An object that fails to match a union member reports only that member's issues.
