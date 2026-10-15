---
'@sanity-labs/typed-schema': minor
---

`enums()` is renamed to `enum()`. `enums()` still works but is deprecated. Write `s.enum([...])` with a namespace import; `enum` is a reserved word, so a named import has to rename it: `import {enum as enumOf} from '@sanity-labs/typed-schema'`.
