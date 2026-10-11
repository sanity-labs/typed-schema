---
'@sanity-labs/typed-schema': minor
---

`block()` now accepts a `reference()`, `image()` or `file()` as `inline` or `annotation`, and `portableText()` accepts one as `element`. Each can be used on its own or in a `union()` with typed objects or with each other. Previously they had to be wrapped in a typed object:

```ts
const Author = document({_type: literal('author'), name: string()})

const Body = portableText({
  block: block({inline: reference(Author)}),
  element: union([
    image({alt: string()}),
    object({_type: literal('codeBlock'), code: string()}),
  ]),
})
```
