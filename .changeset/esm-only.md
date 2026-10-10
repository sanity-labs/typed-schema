---
'@sanity/sanitype': minor
---

Publish as ESM only. The CommonJS build (`dist/index.cjs`) is no longer shipped; `require('@sanity/sanitype')` consumers must migrate to `import` (or Node 22.12+/20.19+ `require(esm)`).
