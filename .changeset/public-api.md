---
'@sanity-labs/typed-schema': minor
---

The public API is cleaned up:

- Now exported: `portableText`, `never`, `rename`, `required`, `deepRequired`, `shallowPartial`, `shallowRequired`, `createLoader`, `verifyUniqueTypeNames` and `DuplicateTypeNameError`.
- No longer exported: the stub `loadDocument`/`loadReference` (use `createLoader()`), the experimental form API, `pickDeep`, the `parseXxx` sub-parsers and internal helper types.
- `RequiredShape` is split into `ShallowRequiredShape` and `DeepRequiredShape`.
