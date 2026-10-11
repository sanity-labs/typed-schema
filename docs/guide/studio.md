# Using a typed schema in Sanity Studio

`toClassicSchema(documentSchema, {locale?, fallback?})` converts a document schema to the array of schema type definitions a Studio config expects. It maps `title`, `description`, `deprecated` and `readOnly` from the [annotations](/guide/annotations) onto the classic definitions, resolving translated text to `locale`, or to `fallback` when `locale` has no entry.

::: warning Proof of concept
`toClassicSchema` does not emit referenced document types, which fields are required, or Portable Text styles, decorators and annotations. Treat the result as a starting point.
:::

Recursive object types become named top-level types, referred to by their `_type`. `toClassicSchema()` throws on a recursive object type without a `_type` literal. An image or file can't become a named type, since its `_type` is always `image` or `file`, so a cycle through one must also pass through an object with a `_type` literal or a `reference()`.

```ts twoslash
// @filename: sanity.d.ts
declare module 'sanity' {
  export function defineConfig(config: {
    projectId: string
    dataset: string
    schema: {types: unknown[]}
  }): unknown
}
// @filename: sanity.config.ts
// ---cut---
import * as s from '@sanity-labs/typed-schema'
import {defineConfig} from 'sanity'

const Author = s.document({_type: s.literal('author'), name: s.string()})

type Author = s.Infer<typeof Author>

export default defineConfig({
  projectId: 'abc123',
  dataset: 'production',
  schema: {types: s.toClassicSchema(Author)},
})
```

[`examples/compat-studio`](https://github.com/sanity-labs/typed-schema/tree/main/examples/compat-studio) runs a Studio on it.
