# @sanity-labs/typed-schema

_TypeScript-first Sanity schemas with static type inference and optional runtime validation_

> [!NOTE]
> This is an experiment and not an official, nor supported way of declaring Sanity schemas. Read about what to expect from Sanity Labs projects here: https://github.com/sanity-labs#what-to-expect

Declare a content model once, as TypeScript values. The same definition gives you the TypeScript type of its documents and validates incoming data:

```ts
import {
  document,
  type Infer,
  literal,
  number,
  optional,
  parse,
  string,
} from '@sanity-labs/typed-schema'

export const pet = document({
  _type: literal('pet'),
  name: string(),
  birthYear: optional(number()),
})

// {_type: 'pet'; name: string; birthYear?: number; _id?: string; _rev?: string; ...}
export type Pet = Infer<typeof pet>

// throws a ParseError if the input does not match the schema
const fido = parse(pet, {_type: 'pet', name: 'Fido'})
```

## Table of contents

<!-- TOC -->

- [Why](#why)
  - [Constraints checked at compile time](#constraints-checked-at-compile-time)
  - [A content model you can share](#a-content-model-you-can-share)
  - [Sanity conventions at the type level](#sanity-conventions-at-the-type-level)
  - [Type-safe content migrations](#type-safe-content-migrations)
  - [Why not Zod?](#why-not-zod)
- [Getting started](#getting-started)
- [Guide](#guide)
  - [Declaring a document](#declaring-a-document)
  - [Parsing and errors](#parsing-and-errors)
  - [Arrays and `_key`](#arrays-and-_key)
  - [Composing schemas](#composing-schemas)
  - [Partial and required variants](#partial-and-required-variants)
  - [Document lifecycles](#document-lifecycles)
  - [Recursive schemas](#recursive-schemas)
  - [Loading documents and references](#loading-documents-and-references)
  - [Unique type names (GraphQL strict mode)](#unique-type-names-graphql-strict-mode)
  - [Using a typed schema in Sanity Studio](#using-a-typed-schema-in-sanity-studio)
- [Limitations](#limitations)
- [API reference](#api-reference)
  - [Primitives](#primitives)
  - [Objects, documents and assets](#objects-documents-and-assets)
  - [Arrays, unions and references](#arrays-unions-and-references)
  - [Portable Text](#portable-text)
  - [Modifiers](#modifiers)
  - [Schema transforms](#schema-transforms)
  - [Parsing](#parsing)
  - [Lifecycle helpers](#lifecycle-helpers)
  - [Loaders](#loaders)
  - [Types](#types)
- [Development](#development)
- [Acknowledgements](#acknowledgements)

<!-- TOC -->

## Why

### Constraints checked at compile time

Sanity accepts almost any shape of content, but it does have rules. A classic Sanity schema reports violations of those rules at runtime, usually when the Studio reloads during development. With typed schemas the same violations are type errors in your editor and in `tsc`:

1. Arrays of arrays.
2. Arrays that mix primitive values and objects.
3. Unions of untyped objects. Object unions must consist of objects with a `_type` literal, because a partially edited object (an empty one, say) is otherwise impossible to match to a schema type during real-time collaboration.
4. Field names that start with an underscore. These are reserved for system fields.
5. Characters that are not allowed in field names.

### A content model you can share

A classic Sanity schema mixes the content model with presentation: input components, previews, field groups and titles. That makes the schema hard to use outside the Studio and hard to reuse across teams.

A typed schema is plain data describing content only. It can be:

- published to npm and versioned with semver, so a breaking change to a shared type fails the downstream build instead of failing in production,
- used in any runtime (Node, edge, browser) without pulling in React,
- used to validate content coming from another system before it is written to Sanity.

Several variants of one type can live side by side: a `ProductV2` that renames `client` to `customer`, or a type with one field removed for a specific context.

### Sanity conventions at the type level

Sanity attaches data to your content that you did not declare. Typed schemas model it:

1. Objects inside arrays get a `_key: string`. The inferred array element type includes it, so there is no `item as T & {_key: string}`.
2. Documents get `_id`, `_rev`, `_createdAt` and `_updatedAt`.
3. A document goes through stages, and each stage has its own type. A document fetched from the API always has `_id` and `_rev`; one created on the client does not yet. A draft has every field optional. A published document has passed validation, so required fields are present. See [Document lifecycles](#document-lifecycles).

### Type-safe content migrations

Because schemas compose (`extend`, `omit`, `pick`, `rename`), two versions of a content model can coexist during a migration. A migration function takes `Infer<typeof v1.human>` and returns `Infer<typeof current.human>`, and the compiler checks every field. `examples/content-migration` shows the pattern.

### Why not Zod?

[Zod](https://zod.dev/) is the inspiration for this library, and nothing here replaces it for general validation. Zod accepts values a Sanity document cannot hold (`Set`, `Map`, functions, promises) and has no notion of `_key`, `_type`, references, drafts, or the field-name rules above. This library covers the subset Sanity can store and builds those conventions in.

## Getting started

Requires TypeScript 6.0 or later with `strict: true` in `tsconfig.json`. Install with your package manager:

```sh
npm install @sanity-labs/typed-schema
pnpm add @sanity-labs/typed-schema
bun add @sanity-labs/typed-schema
yarn add @sanity-labs/typed-schema
```

The package is published as ES modules only.

## Guide

### Declaring a document

Every schema is a value built from creator functions. `Infer` turns a schema into its TypeScript type.

```ts
import {
  boolean,
  document,
  type Infer,
  literal,
  number,
  object,
  optional,
  parse,
  string,
  union,
} from '@sanity-labs/typed-schema'

export const userSchema = document({
  _type: literal('user'),
  name: string(),
  idOrHandle: union([string(), number()]),
  isAdmin: optional(boolean()),
  address: object({
    city: optional(string()),
  }),
})

export type User = Infer<typeof userSchema>

const user = parse(userSchema, {
  _type: 'user',
  name: 'Grace Hopper',
  idOrHandle: 'grace',
  isAdmin: true,
  address: {city: 'Arlington'},
})

// @ts-expect-error TS2339: Property 'noSuchProperty' does not exist on type
user.noSuchProperty

// @ts-expect-error TS2365: Operator '+' cannot be applied to types '{city?: string}' and 'number'
user.address + 2
```

### Parsing and errors

`parse(schema, input)` returns the typed value or throws `ParseError`. `safeParse` returns a result object instead, with every problem found, not only the first:

```ts
import {
  document,
  literal,
  number,
  ParseError,
  parse,
  safeParse,
  string,
} from '@sanity-labs/typed-schema'

const pet = document({_type: literal('pet'), name: string(), age: number()})

const result = safeParse(pet, {_type: 'pet', name: 42})
if (result.status === 'fail') {
  // [
  //   {path: ['name'], code: 'INVALID_TYPE', input: 42, message: 'Expected a string'},
  //   {path: ['age'], code: 'INVALID_TYPE', input: undefined, message: 'Expected a finite number'},
  // ]
  console.log(result.errors)
}

try {
  parse(pet, {_type: 'pet', name: 42})
} catch (err) {
  if (err instanceof ParseError) {
    // Invalid input at "name": Expected a string (+ 1)
    console.log(err.message, err.errors)
  }
}
```

Parsing strips properties the schema does not declare rather than rejecting them.

### Arrays and `_key`

Sanity requires every object in an array to carry a `_key`. When the element of `array()` is object-like (an object, reference, image, file, block, or a union of those), the inferred element type includes `_key` and parsing requires it. Arrays of primitives do not have keys.

```ts
import {array, type Infer, object, string} from '@sanity-labs/typed-schema'

const tags = array(string())
const addresses = array(object({city: string()}))

type Tags = Infer<typeof tags> // string[]
type Addresses = Infer<typeof addresses> // {city: string; _key: string}[]
```

### Composing schemas

Shapes are plain objects, so spreading works. `extend`, `omit`, `pick` and `rename` do the same for whole schemas and keep the inferred types in sync:

```ts
import {
  extend,
  literal,
  number,
  object,
  omit,
  pick,
  rename,
  string,
} from '@sanity-labs/typed-schema'

const base = object({name: string(), other: string(), irrelevant: number()})

const extended = extend(base, {extra: string()})
const withoutIrrelevant = omit(base, ['irrelevant'])
const nameOnly = pick(base, ['name'])

// same fields as `base`, declared by spreading the shape
const spread = object({...base.shape, extra: string()})

const client = object({_type: literal('client'), name: string()})
const customer = rename(client, 'customer') // _type is now the literal 'customer'
```

`omit` and `pick` on a document keep the system fields (`_id`, `_rev`, ...) even if you list them.

### Partial and required variants

A form lets users fill in fields gradually, so you want a type where everything is optional while they edit and a type where required fields are required when they save. Rather than making every field optional in the content model, derive the variants:

| Function             | Effect                                                           |
| -------------------- | ---------------------------------------------------------------- |
| `shallowPartial(s)`  | Every top-level field becomes optional                           |
| `shallowRequired(s)` | Every top-level field becomes required                           |
| `deepPartial(s)`     | Every field becomes optional, recursively through nested objects |
| `deepRequired(s)`    | Every field becomes required, recursively through nested objects |
| `required(s)`        | Removes `optional()` from a single schema                        |

`_type` stays required in all of them.

```ts
import {
  deepPartial,
  type Infer,
  object,
  string,
} from '@sanity-labs/typed-schema'

const contactDetails = object({
  name: string(),
  address: object({street: string(), city: string()}),
  email: string(),
})

// Validate against this when the user saves
type ValidContactDetails = Infer<typeof contactDetails>

// Use this while the form is being filled in
const partialContactDetails = deepPartial(contactDetails)
type PartialContactDetails = Infer<typeof partialContactDetails>
// {name?: string; address?: {street?: string; city?: string}; email?: string}
```

### Document lifecycles

A document schema describes the published, validated form. `draft()` and `stored()` derive the other stages:

- `draft(doc)` makes every field except `_type` optional, recursively.
- `stored(doc)` makes `_id`, `_rev`, `_createdAt` and `_updatedAt` required, which is what the API returns.
- `stored(draft(doc))` is a draft as the API returns it.

```ts
import {
  document,
  draft,
  type Infer,
  literal,
  parse,
  stored,
  string,
} from '@sanity-labs/typed-schema'

const pet = document({_type: literal('pet'), name: string()})

const storedPet = parse(stored(pet), {
  _type: 'pet',
  _id: 'fido',
  _rev: 'abc',
  _createdAt: '2024-01-01T00:00:00Z',
  _updatedAt: '2024-01-01T00:00:00Z',
  name: 'Fido',
})
storedPet._rev.toUpperCase() // _rev is a string, not string | undefined

const petDraft = draft(pet)
const storedDraft = parse(stored(petDraft), {
  _type: 'pet',
  _id: 'drafts.fido',
  _rev: 'abc',
  _createdAt: '2024-01-01T00:00:00Z',
  _updatedAt: '2024-01-01T00:00:00Z',
})
storedDraft.name // string | undefined

// A new published pet needs its required fields but no system fields
const newPet: Infer<typeof pet> = {_type: 'pet', name: 'Rex'}
// A new draft needs neither
const newDraft: Infer<typeof petDraft> = {_type: 'pet'}
```

### Recursive schemas

`lazy(() => schema)` defers a reference to a schema that is not defined yet. TypeScript cannot infer the type of a self-referencing value, so declare the output type by hand and annotate the schema with it:

```ts
import {
  array,
  document,
  lazy,
  literal,
  reference,
  type SanityArrayValue,
  type SanityDocumentType,
  type SanityDocumentValue,
  type SanityReferenceValue,
  string,
} from '@sanity-labs/typed-schema'

interface Person extends SanityDocumentValue {
  name: string
  friends: SanityArrayValue<SanityReferenceValue<Person>>
}

const person: SanityDocumentType<Person> = document({
  _type: literal('person'),
  name: string(),
  friends: lazy(() => array(reference(person))),
})
```

The thunk runs once, the first time the schema is parsed, and the result is cached.

### Loading documents and references

`createLoader(fetch)` wraps a function that fetches a document by id and returns typed `loadDocument` and `loadReference` helpers. The library does not talk to the Sanity API itself; you supply the fetch, for example with `@sanity/client`:

```ts
import {
  createLoader,
  document,
  literal,
  reference,
  string,
} from '@sanity-labs/typed-schema'
import {createClient} from '@sanity/client'

const client = createClient({projectId: 'abc123', dataset: 'production'})

const {loadDocument, loadReference} = createLoader((id, fields) =>
  client.fetch(`*[_id == $id][0]{${fields.join(', ')}}`, {id}),
)

const author = document({_type: literal('author'), name: string()})
const post = document({
  _type: literal('post'),
  title: string(),
  author: reference(author),
})

const welcome = await loadDocument(post, 'welcome') // Infer<typeof post>
const writer = await loadReference(welcome.author) // the stored author document
```

`loadDocument` parses what the fetch returns, so a document that does not match its schema rejects with a `ParseError`. `fields` is the list of top-level field names in the schema, so you can project only what you need.

### Unique type names (GraphQL strict mode)

Sanity's GraphQL API needs every `_type` in a schema to map to exactly one shape. `strictMode(schema)` walks the schema and throws a `StrictModeError` if the same `_type` literal appears in more than one place; `safeStrictMode` returns the duplicates instead of throwing.

```ts
import {
  document,
  literal,
  object,
  strictMode,
  string,
} from '@sanity-labs/typed-schema'

const post = strictMode(
  document({
    _type: literal('post'),
    author: object({_type: literal('person'), name: string()}),
    // a second 'person' object here would throw
  }),
)
```

### Using a typed schema in Sanity Studio

`toClassicSchema(documentSchema)` converts a document schema to the array of schema type definitions a Studio config expects. It is a proof of concept: it does not emit referenced document types, required-ness, or Portable Text styles and decorators, so treat the result as a starting point. `examples/compat-studio` runs a Studio on it.

```ts
import {
  document,
  literal,
  string,
  toClassicSchema,
} from '@sanity-labs/typed-schema'
import {defineConfig} from 'sanity'

const human = document({_type: literal('human'), name: string()})

export default defineConfig({
  projectId: 'abc123',
  dataset: 'production',
  schema: {types: toClassicSchema(human)},
})
```

## Limitations

Inference is only as precise as the schema literal TypeScript can see. A shape built dynamically infers as `{}`:

```ts
import {object, parse, string} from '@sanity-labs/typed-schema'

const shape: Record<string, ReturnType<typeof string>> = {}
for (const key of ['firstName', 'lastName']) {
  shape[key] = string()
}

const schema = object(shape)
// value is typed as {} even though parsing checks both fields
const value = parse(schema, {firstName: 'Grace', lastName: 'Hopper'})
```

Write shapes as literals (`object({firstName: string(), lastName: string()})`) to get narrow types.

Other things to know:

- `date()` accepts `YYYY-MM-DD`; `dateTime()` accepts ISO 8601 with a time zone (`Z` or `±HH:mm`), with or without fractional seconds.
- Union members must all be primitives or all be typed objects. Mixing the two is a type error.
- Unknown `_type` values in an object union fail to parse.

## API reference

All functions are named exports of `@sanity-labs/typed-schema`.

### Primitives

| Creator                                                      | Inferred type                                                 | Notes                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `string()`                                                   | `string`                                                      |                                                                                |
| `number(constraints?)`                                       | `number`                                                      | `{min, max}` or `{gt, lt}`, plus `step`. `NaN` and infinities fail             |
| `safeint()`, `int32()`, `uint32()`, `float32()`, `float64()` | `number`                                                      | `number()` with the matching range; the integer variants require whole numbers |
| `boolean()`                                                  | `boolean`                                                     |                                                                                |
| `literal(value)`                                             | that literal                                                  | `string`, `number` or `boolean` literal                                        |
| `enums(values)`                                              | union of the values                                           | `enums(['a', 'b'])` or `enums({A: 'a', B: 'b'})`                               |
| `date()`                                                     | `string`                                                      | `YYYY-MM-DD`, validated as a calendar date                                     |
| `dateTime()`                                                 | `string`                                                      | ISO 8601 with a time zone designator                                           |
| `geopoint()`                                                 | `{_type: 'geopoint'; lat: number; lng: number; alt?: number}` |                                                                                |
| `never()`                                                    | `never`                                                       | Excluded from unions; useful as a placeholder member                           |

### Objects, documents and assets

| Creator           | Notes                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| `object(shape)`   | Field names may not start with `_`, except `_type`, which must be a `literal()`                                 |
| `document(shape)` | Requires a `_type` literal; adds optional `_id`, `_rev`, `_createdAt`, `_updatedAt`                             |
| `image(shape)`    | `{_type: 'image'; asset: reference to imageAsset}` plus your fields. Pass `{}` for no extra fields              |
| `file(shape)`     | `{_type: 'file'; asset: reference to fileAsset}` plus your fields                                               |
| `imageAsset()`    | The `sanity.imageAsset` document, including `metadata` (dimensions, optional palette, lqip, blurHash, location) |
| `fileAsset()`     | The `sanity.fileAsset` document                                                                                 |

### Arrays, unions and references

| Creator               | Notes                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `array(element)`      | Object-like elements get a required `_key`; primitive elements do not. Arrays of arrays are a type error                                          |
| `union([...members])` | All primitives (including literals and dates) or all typed objects, references, images, files and blocks. Nested unions are flattened             |
| `reference(doc)`      | `{_type: 'reference'; _ref: string; _weak?: boolean}`. The referenced schema travels with the parsed value so `loadReference` can type its result |

### Portable Text

| Creator                          | Notes                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `block(options)`                 | One Portable Text block. Options: `style`, `list`, `decorator` (literals or unions of literals), `inline` and `annotation` (typed objects or unions of them), `_type` (defaults to `block`) |
| `portableText({block, element})` | `array(union([block, element]))`: blocks plus the custom block-level objects allowed between them                                                                                           |

The inferred block type matches what Sanity stores: `style`, `listItem`, `level` and `markDefs` are optional, `children` holds spans (`{_type: 'span'; text; marks: string[]}`) and inline objects. Unconfigured `style` and `list` accept any string.

```ts
import {
  block,
  type Infer,
  literal,
  object,
  portableText,
  string,
  union,
} from '@sanity-labs/typed-schema'

const body = portableText({
  block: block({
    style: union([literal('normal'), literal('h1'), literal('h2')]),
    list: union([literal('bullet'), literal('number')]),
    decorator: union([literal('strong'), literal('em')]),
    annotation: object({_type: literal('link'), href: string()}),
  }),
  element: object({_type: literal('codeBlock'), code: string()}),
})

type Body = Infer<typeof body>
```

### Modifiers

| Function        | Notes                                                          |
| --------------- | -------------------------------------------------------------- |
| `optional(s)`   | The field may be `undefined` or absent                         |
| `required(s)`   | Removes `optional()`, however many times it was applied        |
| `lazy(() => s)` | Defers evaluation; see [Recursive schemas](#recursive-schemas) |

### Schema transforms

Each returns a new schema. Types follow the runtime change.

| Function             | Notes                                                          |
| -------------------- | -------------------------------------------------------------- |
| `extend(s, shape)`   | Adds or overrides fields                                       |
| `omit(s, keys)`      | Removes fields. Document system fields are kept                |
| `pick(s, keys)`      | Keeps only the listed fields (plus system fields on documents) |
| `rename(s, newType)` | Replaces the `_type` literal                                   |
| `shallowPartial(s)`  | Top-level fields optional                                      |
| `shallowRequired(s)` | Top-level fields required                                      |
| `deepPartial(s)`     | All fields optional, recursively                               |
| `deepRequired(s)`    | All fields required, recursively                               |

### Parsing

| Export                     | Notes                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `parse(schema, input)`     | Returns `Infer<typeof schema>` or throws `ParseError`                                                                                       |
| `safeParse(schema, input)` | Returns `{status: 'ok', value}` or `{status: 'fail', errors}`                                                                               |
| `ParseError`               | `message` summarises the first error; `errors` holds all of them                                                                            |
| `ParseErrorDetails`        | `{path, code, input, message}`. `path` is an array of field names and array indexes or `_key`s                                              |
| `ErrorCode`                | `'INVALID_TYPE'`, `'NUM_TOO_SMALL'`, `'NUM_TOO_BIG'`, `'NUM_NOT_MULTIPLE_OF'`, `'INVALID_OBJECT_UNION'`, `'ARRAY_ELEMENT_NOT_KEYED_OBJECT'` |

### Lifecycle helpers

| Export                                                  | Notes                                                            |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| `draft(doc)`                                            | `deepPartial` for documents; `_type` stays required              |
| `stored(doc)`                                           | `_id`, `_rev`, `_createdAt`, `_updatedAt` become required        |
| `StoredDocument<T>`                                     | The type-level equivalent of `stored()`, applied to a value type |
| `strictMode(s)`, `safeStrictMode(s)`, `StrictModeError` | See [Unique type names](#unique-type-names-graphql-strict-mode)  |

### Loaders

| Export                         | Notes                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `createLoader(fetch)`          | `fetch: (id, fieldNames) => Promise<unknown>`. Returns `{loadDocument, loadDocuments, loadReference, loadReferences}` |
| `createDocumentLoader(fetch)`  | Only `loadDocument`                                                                                                   |
| `createReferenceLoader(fetch)` | Only `loadReference`                                                                                                  |

### Types

| Type                        | Notes                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `Infer<typeof schema>`      | The value type of a schema                                                                |
| `SanityType<Output>`        | Base type of every schema; `SanityObject`, `SanityDocument`, `SanityArray`, ... extend it |
| `SanityDocumentType<Value>` | A document schema annotated by its value type; use for recursive schemas                  |
| `SanityDocumentValue`       | `{_type: string; _id?: string; _rev?: string; _createdAt?: string; _updatedAt?: string}`  |
| `SanityReferenceValue<T>`   | The value of a `reference()` to a schema of type `T`                                      |
| `SanityArrayValue<T>`       | `T[]`, with `_key` added to object elements                                               |

The type guards (`isObjectSchema`, `isDocumentSchema`, `isOptionalSchema`, ...) are exported for code that walks schemas.

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
| `pnpm typecheck`             | `tsc` on `src/`; `pnpm typecheck:examples` covers `examples/` and `exploration/` |
| `pnpm lint`, `pnpm format`   | oxlint and oxfmt                                                                 |
| `pnpm check`                 | Everything CI runs                                                               |
| `pnpm example:compat-studio` | A Sanity Studio using `toClassicSchema`                                          |

`examples/` holds small, typechecked examples; a branch with a new example is a good way to report a bug or a gap. `exploration/` holds sketches that are not part of the package.

### Releasing

Releases use [changesets](https://github.com/changesets/changesets). Add one with each user-facing change:

```sh
pnpm changeset
```

On merge to `main`, a "chore: version packages" pull request is opened. Merging it bumps the version, updates `CHANGELOG.md` and publishes to npm with trusted publishing from the `npm-publish` GitHub environment.

## Acknowledgements

The design follows [zod](https://zod.dev), which made runtime schemas with static type inference common practice.
