# @sanity-labs/typed-schema

_TypeScript-first Sanity schemas with static type inference and optional runtime validation_

> [!NOTE]
> This is an experiment and not an official, nor supported way of declaring Sanity schemas. Read [what to expect from Sanity Labs projects](https://github.com/sanity-labs#what-to-expect).

Declare a content model once, as TypeScript values. The same definition gives you the TypeScript type of its documents and validates incoming data.

**[Documentation](https://sanity-labs.github.io/typed-schema/)** · **[Playground](https://sanity-labs.github.io/typed-schema/playground)**

```ts
import * as s from '@sanity-labs/typed-schema'
import {createClient} from '@sanity/client'

export const Recipe = s.document({
  _type: s.literal('recipe'),
  title: s.string(),
  servings: s.optional(s.number()),
})

// {_type: 'recipe'; title: string; servings?: number; _id?: string; _rev?: string; ...}
export type Recipe = s.Infer<typeof Recipe>

const client = createClient({
  projectId: 'abc123',
  dataset: 'production',
  apiVersion: '2025-02-19',
  useCdn: true,
})

const result = s.parse(Recipe, await client.fetch('*[_type == "recipe"][0]'))

if (result.ok) {
  const recipe = result.value
} else {
  // for a recipe without a title and with "four" as servings:
  // Invalid input (2 issues):
  //   title: Expected a string
  //   servings: Expected a finite number
  console.error(result.error.message)
}
```

Invalid schemas fail at compile time. Each of these is a type error:

```ts
s.array(s.array(s.number())) // arrays of arrays
s.union([s.object({url: s.string()}), s.object({text: s.string()})]) // object unions without a _type
s.object({_secret: s.string()}) // field names starting with _
```

## Install

```sh
npm install @sanity-labs/typed-schema
```

Requires TypeScript 6.0 or later with `strict: true`. The package is published as ES modules only.

## Learn more

The [documentation](https://sanity-labs.github.io/typed-schema/) covers:

- [why typed schemas](https://sanity-labs.github.io/typed-schema/guide/why) and how they compare to Zod,
- a [guide](https://sanity-labs.github.io/typed-schema/guide/declaring-a-document) to documents, parsing and Standard Schema, arrays, Portable Text, composition, custom creators, lifecycles, recursive schemas, annotations, loaders, GraphQL compatibility and Studio compatibility,
- the [API reference](https://sanity-labs.github.io/typed-schema/api/schema-types).

## Development

```sh
git clone git@github.com:sanity-labs/typed-schema.git
cd typed-schema
pnpm install
```

| Script                       | What it runs                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`                   | Build, typecheck and tests in watch mode                                         |
| `pnpm test`                  | Runtime tests and `.test-d.ts` type tests                                        |
| `pnpm typecheck`             | `tsc` on `src/`; `pnpm typecheck:examples` covers `examples/` and `experiments/` |
| `pnpm lint`, `pnpm format`   | oxlint and oxfmt                                                                 |
| `pnpm check`                 | Everything CI runs                                                               |
| `pnpm example:compat-studio` | A Sanity Studio using `toClassicSchema`                                          |
| `pnpm docs:dev`              | The documentation site in `docs/`; `pnpm docs:build` builds it                   |

`examples/` holds small, typechecked examples; a branch with a new example is a good way to report a bug or a gap. `experiments/` holds code that is not part of the package.

### Releasing

Releases use [changesets](https://github.com/changesets/changesets). Add one with each user-facing change:

```sh
pnpm changeset
```

On merge to `main`, a "chore: version packages" pull request is opened. Merging it bumps the version, updates `CHANGELOG.md` and publishes to npm with trusted publishing from the `npm-publish` GitHub environment.

## Acknowledgements

This package is heavily inspired by [zod](https://zod.dev). The getter syntax for recursive schemas, and the type design that lets TypeScript infer them, both come from [Zod 4](https://zod.dev/api#recursive-objects).
