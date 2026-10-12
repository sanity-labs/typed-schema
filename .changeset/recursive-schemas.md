---
'@sanity-labs/typed-schema': minor
---

Recursive schemas can be declared with a getter, and their type is inferred without annotations:

```ts
const Category = object({
  _type: literal('category'),
  name: string(),
  get subcategories() {
    return array(Category)
  },
})
```

`toClassicSchema()` now converts recursive fields instead of dropping them.
