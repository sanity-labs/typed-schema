---
'@sanity-labs/typed-schema': minor
---

The public API is cleaned up:

- Now exported: `portableText`, `never`, `rename`, `required`, `deepRequired`, `shallowPartial`, `shallowRequired`, `createLoader`, `verifyUniqueTypeNames` and `DuplicateTypeNameError`.
- No longer exported: the stub `loadDocument`/`loadReference` (use `createLoader()`), the experimental form API, `pickDeep`, the `parseXxx` sub-parsers and internal helper types.
- `enums()` is renamed to `enum()`; `enums()` still works but is deprecated. Write `s.enum([...])` with a namespace import; `enum` is a reserved word, so a named import has to rename it: `import {enum as enumOf} from '@sanity-labs/typed-schema'`.
- `RequiredShape` is split into `ShallowRequiredShape` and `DeepRequiredShape`.
