---
'@sanity-labs/typed-schema': minor
---

An object array's `element` has an `unkeyed` property: the schema given to `array()`, without the `_key` field. Use it to get the element schema of an array declared inline, for example `Recipe.shape.ingredients.element.unkeyed`. Each member of a union element has one too.
