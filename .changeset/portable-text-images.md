---
'@sanity-labs/typed-schema': patch
---

`block()` accepts references, images and files as `inline` and `annotation`, alone or in a `union()` with typed objects, for example `annotation: reference(Author)`. Previously they had to be wrapped in a typed object. `portableText()` accepts them as `element`:

```ts
const Body = portableText({
  block: block({inline: reference(Author)}),
  element: union([
    image({alt: string()}),
    object({_type: literal('codeBlock'), code: string()}),
  ]),
})
```
