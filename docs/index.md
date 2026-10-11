---
layout: home

hero:
  name: typed-schema
  text: TypeScript-first Sanity schemas
  tagline: Declare a content model once. Get its TypeScript types and a runtime validator from the same definition.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Try the playground
      link: /playground
    - theme: alt
      text: GitHub
      link: https://github.com/sanity-labs/typed-schema

features:
  - title: Inferred types
    details: <code>Infer&lt;typeof schema&gt;</code> gives you the document type, including <code>_key</code> on array items and the system fields Sanity adds.
  - title: Constraints at compile time
    details: Arrays of arrays, untyped object unions and reserved field names are type errors in your editor, not runtime errors in the Studio.
  - title: Runtime validation
    details: <code>parse</code> checks incoming data against the same schema and reports every problem with its path.
  - title: Plain, shareable data
    details: Schemas contain no React or Studio code, so you can publish them to npm and use them in Node, edge runtimes or the browser.
---

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

export const Recipe = s.document({
  _type: s.literal('recipe'),
  title: s.string(),
  servings: s.optional(s.number()),
})

export type Recipe = s.Infer<typeof Recipe>

// ---cut-start---
import {type SanityClient} from '@sanity/client'
declare const client: SanityClient
// ---cut-end---
const result = s.parse(Recipe, await client.fetch('*[_type == "recipe"][0]'))

if (result.ok) {
  const recipe = result.value
  //    ^?
} else {
  // for a recipe without a title and with "four" as servings:
  // Invalid input (2 issues):
  //   title: Expected a string
  //   servings: Expected a finite number
  console.error(result.error.message)
}
```
