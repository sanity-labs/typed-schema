---
'@sanity-labs/typed-schema': minor
---

Recursive schemas can be declared with a getter and are inferred without type annotations:

```ts
const Category = object({
  _type: literal('category'),
  name: string(),
  get subcategories() {
    return array(Category)
  },
})
```

At runtime the getter field holds a `lazy()` schema.

`deepPartial()` and `partial()` now make fields optional inside `lazy()` schemas too, and `deepRequired()` and `required()` make them required, so nested values of recursive schemas follow the same rules as the top level.

A field is now optional only when it holds an `optional()` schema, directly or inside `lazy()`. A field annotated by hand as `Schema<T | undefined>` is a required key whose value may be `undefined`; wrap it in `optional()` to make the key optional.
