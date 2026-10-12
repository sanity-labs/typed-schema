# Standard Schema

Every schema implements [Standard Schema](https://standardschema.dev), so libraries that support it accept typed schemas directly, with no adapter. The Standard Schema site has the spec and a list of the libraries that support it.

This [Hono](https://hono.dev) route receives a Sanity webhook and validates its body with [`@hono/standard-validator`](https://github.com/honojs/middleware/tree/main/packages/standard-validator):

```ts twoslash
import {sValidator} from '@hono/standard-validator'
import * as s from '@sanity-labs/typed-schema'
import {Hono} from 'hono'

const Recipe = s.document({
  _type: s.literal('recipe'),
  title: s.string(),
  servings: s.optional(s.number()),
})

const app = new Hono()

app.post(
  '/webhooks/recipe-published',
  sValidator('json', Recipe, (result, c) => {
    if (!result.success) {
      // for a body with title: 42:
      // Invalid input (1 issue):
      //   title: Expected a string
      return c.text(s.formatIssues(result.error), 400)
    }
  }),
  c => {
    const recipe = c.req.valid('json')
    //    ^?
    return c.text(`Received ${recipe.title}`)
  },
)
```

## How typed schemas implement it

- `validate` runs [`parse`](./parsing) and returns synchronously. In code that only uses typed schemas, call `parse` or `parseOrThrow` instead: they return the same value, and their issues also have a `code`.
- The input type is the value as stored (`Infer`). The output type is what `parse` returns (`Parsed`), which adds a non-enumerable `$refSchema` key to reference values; see [Loading documents and references](./loaders).
- In issue paths, an item in an array of objects appears as `{key: 0, _key: 'a1'}`. A library that follows the spec finds the item by its position in `key`; code that knows about Sanity can use the `_key`.
- `formatIssues` and `formatPath` accept Standard Schema issues and paths from any library, and write them the way `ParseError.message` does.
- The `~standard` property is non-enumerable, like `output`, so `JSON.stringify` and `Object.keys` skip it and schemas stay plain data.
- The package exports the `StandardSchemaV1` type, so code that accepts a schema from any library does not need `@standard-schema/spec`.
