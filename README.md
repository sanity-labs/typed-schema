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

export const Pet = document({
  _type: literal('pet'),
  name: string(),
  birthYear: optional(number()),
})

// {_type: 'pet'; name: string; birthYear?: number; _id?: string; _rev?: string; ...}
export type Pet = Infer<typeof Pet>

// throws a ParseError if the input does not match the schema
const fido = parse(Pet, {_type: 'pet', name: 'Fido'})
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
3. Whether a document is complete and whether it has been committed to the Content Lake are two separate questions, and each has its own transform. A document fetched from the API always has `_id` and `_rev`; one you construct locally does not yet. A document read from the `drafts` perspective, or one being edited, may be missing fields. See [Document lifecycles](#document-lifecycles).

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

export const User = document({
  _type: literal('user'),
  name: string(),
  idOrHandle: union([string(), number()]),
  isAdmin: optional(boolean()),
  address: object({
    city: optional(string()),
  }),
})

export type User = Infer<typeof User>

const user = parse(User, {
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

Schema constants are PascalCase (`User`, `Address`), the same as the type inferred from them. TypeScript lets a `const` and a `type` share a name, so `User` is the schema in a value position and the parsed document type in a type position, and one import gives you both. Creator and transform functions (`document()`, `reference()`, `extend()`) stay camelCase, and `_type` literals keep Sanity's camelCase type names (`'user'`).

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

const Pet = document({_type: literal('pet'), name: string(), age: number()})

const result = safeParse(Pet, {_type: 'pet', name: 42})
if (result.status === 'fail') {
  // [
  //   {path: ['name'], code: 'INVALID_TYPE', input: 42, message: 'Expected a string'},
  //   {path: ['age'], code: 'INVALID_TYPE', input: undefined, message: 'Expected a finite number'},
  // ]
  console.log(result.errors)
}

try {
  parse(Pet, {_type: 'pet', name: 42})
} catch (err) {
  if (err instanceof ParseError) {
    // Invalid input at "name": Expected a string (+ 1)
    console.log(err.message, err.errors)
  }
}
```

Parsing strips properties the schema does not declare rather than rejecting them.

`parse` returns `Parsed<typeof Pet>`, which is `Infer<typeof Pet>` plus a hidden `$refSchema` key on reference values; see [Loading documents and references](#loading-documents-and-references).

### Arrays and `_key`

Sanity requires every object in an array to carry a `_key`. When the element of `array()` is object-like (an object, reference, image, file, block, or a union of those), the inferred element type includes `_key` and parsing requires it. Arrays of primitives do not have keys.

```ts
import {array, type Infer, object, string} from '@sanity-labs/typed-schema'

const Tags = array(string())
const Addresses = array(object({city: string()}))

type Tags = Infer<typeof Tags> // string[]
type Addresses = Infer<typeof Addresses> // {city: string; _key: string}[]
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

const Base = object({name: string(), other: string(), irrelevant: number()})

const Extended = extend(Base, {extra: string()})
const WithoutIrrelevant = omit(Base, ['irrelevant'])
const NameOnly = pick(Base, ['name'])

// same fields as `Base`, declared by spreading the shape
const Spread = object({...Base.shape, extra: string()})

const Client = object({_type: literal('client'), name: string()})
const Customer = rename(Client, 'customer') // _type is now the literal 'customer'
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

const ContactDetails = object({
  name: string(),
  address: object({street: string(), city: string()}),
  email: string(),
})

// Validate against this when the user saves
type ValidContactDetails = Infer<typeof ContactDetails>

// Use this while the form is being filled in
const PartialContactDetails = deepPartial(ContactDetails)
type PartialContactDetails = Infer<typeof PartialContactDetails>
// {name?: string; address?: {street?: string; city?: string}; email?: string}
```

### Document lifecycles

A document schema describes a complete document as you construct it locally. Drafts, documents fetched from the API and documents mid-edit are derived from it. `document()` makes the four system fields optional, so a new pet needs its declared fields and nothing else:

```ts
const Pet = document({_type: literal('pet'), name: string()})
const pet: Infer<typeof Pet> = {_type: 'pet', name: 'Rex'}
```

Two transforms move away from that shape, and they are independent of each other:

- `partial(doc)` relaxes completeness: every field except `_type` becomes optional, recursively. This is what you hold while editing, and what the `drafts` or `raw` perspective may return. It is `deepPartial` restricted to documents.
- `committed(doc)` adds persistence: `_id`, `_rev`, `_createdAt` and `_updatedAt` become required, because the Content Lake assigns them when it accepts a mutation. Every document the API returns is committed.

Because the axes are independent, the four combinations are four schemas:

|                   | Complete         | May be incomplete         |
| ----------------- | ---------------- | ------------------------- |
| **Not committed** | `Pet`            | `partial(Pet)`            |
| **Committed**     | `committed(Pet)` | `committed(partial(Pet))` |

Apply `committed` last: `partial` would make the system fields optional again.

`DeepPartial<typeof Pet>` and `Committed<typeof Pet>` are the schema types these return, so `Infer<Committed<typeof Pet>>` is the type of a pet as the API returns it. There is no separate value-level transform: derive the schema, then infer.

```ts
import {
  committed,
  type Committed,
  document,
  type Infer,
  literal,
  parse,
  partial,
  string,
} from '@sanity-labs/typed-schema'

const Pet = document({_type: literal('pet'), name: string()})

const committedPet = parse(committed(Pet), {
  _type: 'pet',
  _id: 'fido',
  _rev: 'abc',
  _createdAt: '2024-01-01T00:00:00Z',
  _updatedAt: '2024-01-01T00:00:00Z',
  name: 'Fido',
})
committedPet._rev.toUpperCase() // _rev is a string, not string | undefined

const PartialPet = partial(Pet)
const committedPartialPet = parse(committed(PartialPet), {
  _type: 'pet',
  _id: 'drafts.fido',
  _rev: 'abc',
  _createdAt: '2024-01-01T00:00:00Z',
  _updatedAt: '2024-01-01T00:00:00Z',
})
committedPartialPet.name // string | undefined

// A new pet needs its declared fields but no system fields
const newPet: Infer<typeof Pet> = {_type: 'pet', name: 'Rex'}
// A partial one needs neither
const newPartialPet: Infer<typeof PartialPet> = {_type: 'pet'}

// Name the committed type without calling committed() at runtime
type CommittedPet = Infer<Committed<typeof Pet>>
```

Published, draft and version are perspectives on committed documents rather than shapes of their own. The Content Lake tells them apart by `_id` prefix and by the `perspective` you query with, and under `perspective: 'drafts'` it returns the published `_id` and keeps the real one in `_originalId`. A type that encoded the prefix into `_id` would be wrong under some perspectives, so the library does not model the variant.

In `@sanity/client` terms, `SanityDocumentStub` corresponds to the base schema and `SanityDocument` to `committed(doc)`. `IdentifiedSanityDocumentStub` (`_id` known, nothing else assigned) has no counterpart.

### Recursive schemas

Declare a field that refers to its own schema, or to a schema defined further down, with a getter, the same way as in [Zod](https://zod.dev/api#recursive-objects). TypeScript infers the type without annotations:

```ts
import {
  array,
  document,
  type Infer,
  literal,
  reference,
  string,
} from '@sanity-labs/typed-schema'

const Person = document({
  _type: literal('person'),
  name: string(),
  get friends() {
    return array(reference(Person))
  },
})

type Person = Infer<typeof Person>
```

This also works for mutual recursion (a `User` with posts, each `Post` with an author), through `optional()` and `union()`, and in the fields passed to `extend()`.

The schema creators store the getter as a `lazy()` schema without calling it, so `Person.shape.friends` is a `lazy` schema at runtime even though its static type is the array schema. For the same reason, TypeScript does not check that a getter returns a schema. If it returns something else, parsing throws `Field "friends" is not a schema` the first time it reaches that field.

There are two cases where inference still fails, and the schema becomes `any` with error TS7022 ("implicitly has type 'any' because it does not have a type annotation"):

1. Spreading another shape into the same object literal as the getter (`{...Base.shape, get children() {...}}`). Use `extend(Base, {get children() {...}})` instead.
2. `lazy(() => schema)` without an annotation. Use a getter, or declare the output type by hand and annotate the schema with it:

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

const Person: SanityDocumentType<Person> = document({
  _type: literal('person'),
  name: string(),
  friends: lazy(() => array(reference(Person))),
})
```

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

const Author = document({_type: literal('author'), name: string()})
const Post = document({
  _type: literal('post'),
  title: string(),
  author: reference(Author),
})

const welcome = await loadDocument(Post, 'welcome') // Parsed<Committed<typeof Post>>
const writer = await loadReference(welcome.author) // Parsed<Committed<typeof Author>>
```

`loadDocument` parses what the fetch returns against `committed(Post)`, so a document that does not match its schema, or that lacks `_id`, `_rev`, `_createdAt` or `_updatedAt`, rejects with a `ParseError`. `fields` is the list of top-level field names in the schema, including those four, so you can project only what you need.

`loadDocument` returns `Parsed<Committed<typeof Post>>`, where each reference value includes the schema it points to under a hidden `$refSchema` key. That is how `loadReference(welcome.author)` knows to parse the result as an `Author`. A reference typed as `Infer<typeof Post>['author']`, for example one built by hand or read straight from the client, has no `$refSchema`, so `loadReference` falls back to parsing only the document system fields: the result is typed as a committed document with `_type`, `_id`, `_rev`, `_createdAt` and `_updatedAt` and nothing else.

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

const Post = strictMode(
  document({
    _type: literal('post'),
    author: object({_type: literal('person'), name: string()}),
    // a second 'person' object here would throw
  }),
)
```

### Using a typed schema in Sanity Studio

`toClassicSchema(documentSchema)` converts a document schema to the array of schema type definitions a Studio config expects. It is a proof of concept: it does not emit referenced document types, required-ness, or Portable Text styles and decorators, and it leaves out fields declared with `lazy()` or a getter (recursive fields) without a warning. Treat the result as a starting point. `examples/compat-studio` runs a Studio on it.

```ts
import {
  document,
  literal,
  string,
  toClassicSchema,
} from '@sanity-labs/typed-schema'
import {defineConfig} from 'sanity'

const Human = document({_type: literal('human'), name: string()})

export default defineConfig({
  projectId: 'abc123',
  dataset: 'production',
  schema: {types: toClassicSchema(Human)},
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

const Person = object(shape)
// value is typed as {} even though parsing checks both fields
const value = parse(Person, {firstName: 'Grace', lastName: 'Hopper'})
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

| Creator               | Notes                                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `array(element)`      | Object-like elements get a required `_key`; primitive elements do not. Arrays of arrays are a type error                                                                                                              |
| `union([...members])` | All primitives (including literals and dates) or all typed objects, references, images, files and blocks. Nested unions are flattened                                                                                 |
| `reference(doc)`      | `{_type: 'reference'; _ref: string; _weak?: boolean}`. In `Parsed<>` the value also includes the referenced schema as `$refSchema`, which `loadReference` uses. It is not serialized, and it is absent from `Infer<>` |

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

const Body = portableText({
  block: block({
    style: union([literal('normal'), literal('h1'), literal('h2')]),
    list: union([literal('bullet'), literal('number')]),
    decorator: union([literal('strong'), literal('em')]),
    annotation: object({_type: literal('link'), href: string()}),
  }),
  element: object({_type: literal('codeBlock'), code: string()}),
})

type Body = Infer<typeof Body>
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
| `parse(schema, input)`     | Returns `Parsed<typeof schema>` or throws `ParseError`                                                                                      |
| `safeParse(schema, input)` | Returns `{status: 'ok', value}` or `{status: 'fail', errors}`                                                                               |
| `ParseError`               | `message` summarises the first error; `errors` holds all of them                                                                            |
| `ParseErrorDetails`        | `{path, code, input, message}`. `path` is an array of field names and array indexes or `_key`s                                              |
| `ErrorCode`                | `'INVALID_TYPE'`, `'NUM_TOO_SMALL'`, `'NUM_TOO_BIG'`, `'NUM_NOT_MULTIPLE_OF'`, `'INVALID_OBJECT_UNION'`, `'ARRAY_ELEMENT_NOT_KEYED_OBJECT'` |

### Lifecycle helpers

| Export                                                  | Notes                                                                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `partial(doc)`                                          | `deepPartial` for documents: every field but `_type` becomes optional, recursively. Returns `DeepPartial<typeof doc>` |
| `committed(doc)`                                        | `_id`, `_rev`, `_createdAt`, `_updatedAt` become required                                                             |
| `Committed<typeof doc>`                                 | The schema type `committed()` returns; `Infer<Committed<typeof doc>>` is a document as the API returns it             |
| `COMMITTED_KEYS`, `CommittedKeys`                       | The fields `committed()` requires, as a constant and as a union of their names                                        |
| `strictMode(s)`, `safeStrictMode(s)`, `StrictModeError` | See [Unique type names](#unique-type-names-graphql-strict-mode)                                                       |

### Loaders

| Export                         | Notes                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `createLoader(fetch)`          | `fetch: (id, fieldNames) => Promise<unknown>`. Returns `{loadDocument, loadDocuments, loadReference, loadReferences}`         |
| `createDocumentLoader(fetch)`  | Only `loadDocument`. It resolves to `Parsed<Committed<typeof Doc>>`                                                           |
| `createReferenceLoader(fetch)` | Only `loadReference`. It resolves to `Parsed<Committed<typeof Target>>`, where `Target` is the schema the reference points to |

### Types

| Type                        | Notes                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `Infer<typeof schema>`      | The value type of a schema as stored: plain data, without `$refSchema` on references      |
| `Parsed<typeof schema>`     | What `parse` and the loaders return: `Infer` plus `$refSchema` on every reference value   |
| `SanityType<Output>`        | Base type of every schema; `SanityObject`, `SanityDocument`, `SanityArray`, ... extend it |
| `SanityDocumentType<Value>` | A document schema annotated by its value type; use with `lazy()` for recursive schemas    |
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
| `pnpm typecheck`             | `tsc` on `src/`; `pnpm typecheck:examples` covers `examples/` and `experiments/` |
| `pnpm lint`, `pnpm format`   | oxlint and oxfmt                                                                 |
| `pnpm check`                 | Everything CI runs                                                               |
| `pnpm example:compat-studio` | A Sanity Studio using `toClassicSchema`                                          |

`examples/` holds small, typechecked examples; a branch with a new example is a good way to report a bug or a gap. `experiments/` holds code that is not part of the package.

### Releasing

Releases use [changesets](https://github.com/changesets/changesets). Add one with each user-facing change:

```sh
pnpm changeset
```

On merge to `main`, a "chore: version packages" pull request is opened. Merging it bumps the version, updates `CHANGELOG.md` and publishes to npm with trusted publishing from the `npm-publish` GitHub environment.

## Acknowledgements

This package is heavily inspired by [zod](https://zod.dev). The getter syntax for recursive schemas, and the type design that lets TypeScript infer them, both come from [Zod 4](https://zod.dev/api#recursive-objects).
