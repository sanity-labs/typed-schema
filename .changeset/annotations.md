---
'@sanity-labs/typed-schema': minor
---

Schemas accept annotations as their last argument: `title`, `description`, `guidelines`, `examples`, `deprecated` and `readOnly`.

```ts
const Pet = document(
  {
    _type: literal('pet'),
    name: string({description: 'Display name shown on the adoption card'}),
  },
  {title: 'Pet'},
)
```

Read them back with `getAnnotations()`, and check `examples` against the schema with `validateExamples()`. `toClassicSchema()` passes them on to the Studio schema.
