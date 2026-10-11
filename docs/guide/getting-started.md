# Getting started

Requires TypeScript 6.0 or later with `strict: true` in `tsconfig.json`.

::: code-group

```sh [npm]
npm install @sanity-labs/typed-schema
```

```sh [pnpm]
pnpm add @sanity-labs/typed-schema
```

```sh [yarn]
yarn add @sanity-labs/typed-schema
```

```sh [bun]
bun add @sanity-labs/typed-schema
```

:::

The package is published as ES modules only.

## A first schema

The examples on this site import the package as a namespace, `import * as s from '@sanity-labs/typed-schema'`, so creators read as `s.document()`, `s.string()` and so on. Named imports work just as well.

Every schema is a value built from creator functions. `Infer` turns a schema into its TypeScript type, and `parse` checks a value against the schema at runtime:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Recipe = s.document({
  _type: s.literal('recipe'),
  title: s.string(),
  servings: s.optional(s.number()),
})

type Recipe = s.Infer<typeof Recipe>
//   ^?

const response = await fetch('https://example.com/recipes/pancakes.json')
const result = s.parse(Recipe, await response.json())

if (result.ok) {
  const recipe = result.value
  //    ^?
}
```

Hover any name in the examples on this site to see its type. To try your own schemas, open the [playground](/playground).

## Next steps

- [Declaring a document](./declaring-a-document) covers the creators you will use most.
- [Parsing and errors](./parsing) explains runtime validation.
- [Why typed schemas](./why) describes what the library checks that a classic schema does not.
