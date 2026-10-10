sani*type*
=======

_TypeScript-first Sanity schemas with static type inference and (optional) runtime validation_

> [!WARNING]  
> This is an experiment and not an official, nor supported way of declaring Sanity schemas. Use at own risk.

## Table of contents

<!-- TOC -->

- [Motivation](#motivation)
  - [Instant developer feedback](#instant-developer-feedback)
  - [DRY Content Models](#dry-content-models)
  - [Type-level "Sanity-isms"](#type-level-sanity-isms)
  - [Type Safe Content Migrations](#type-safe-content-migrations)
  - [Why not just use Zod?](#why-not-just-use-zod)
- [Getting started](#getting-started)
  - [Requirements](#requirements)
  - [Install](#install)
  - [npm](#npm)
  - [pnpm](#pnpm)
  - [bun](#bun)
  - [yarn](#yarn)
- [Usage examples](#usage-examples)
  - [Basic example](#basic-example)
  - [Extending types](#extending-types)
    - [The `extend()` helper](#the-extend-helper)
  - [Pick & omit fields](#pick--omit-fields)
  - [Lifecycle and type transforms](#lifecycle-and-type-transforms)
    - [Recursive types](#recursive-types)
    - [Document lifecycles](#document-lifecycles)
- [Limitations & gotchas](#limitations--gotchas)
- [API](#api)
  - [Data types](#data-types)
    - [Primitives](#primitives)
    - [Literal](#literal)
    - [Unions](#unions)
    - [Objects](#objects)
    - [Arrays](#arrays)
    - [References](#references)
    - [Portable text](#portable-text)
    - [Recursive types](#recursive-types-1)
  - [Utilities](#utilities)
    - [Extend](#extend)
    - [Optional](#optional)
    - [Required](#required)
    - [Omit](#omit)
    - [Pick](#pick)
    - [Rename](#rename)
  - [GraphQL Strict mode](#graphql-strict-mode)
- [Development](#development)
- [Acknowledgements & inspiration](#acknowledgements--inspiration)

<!-- TOC -->

## Motivation

Sanity Schemas that has static type inference while enabling runtime validation offers significant advantages over traditional Sanity schemas when working with content at scale.

### Instant developer feedback

Although Sanity lets you express almost anything, it puts forward a handful of constraints on your data model. Today, violations of these constraints are surfaced to developers at runtime, typically during development when reloading the Studio. With Sanitype any violation of these restrictions will be surfaced immediately as type errors both in the IDE and at build/compile time.

Violations of the following constraints will be caught and surfaced instantly in the IDE as type errors when using Sanitype:

1. Multidimensional arrays.
2. Arrays with both primitive values and object values.
3. Object unions with unnamed object types. Object unions are only supported for _typed_ objects (i.e. objects with a `_type` literal). This restriction is necessary in order to support collaborative real-time editing of partial object values. Without a discriminator it would be impossible to tell which schema type a partial (e.g. empty) object belongs to.
4. Fields starting with underscore are not allowed. These are reserved for system fields. Sanitype gives a compile-time error if you define a field starting with underscore.
5. Disallowed characters in field names: There's restrictions on what characters can be used as object properties, if you try to use an invalid character, this will be caught by TypeScript.

### DRY Content Models

Traditional Sanity schemas have a few drawbacks that makes it harder to share and re-use across runtimes, environments and organizations. They define not only the content model, they also include presentational concerns, which leads to several drawbacks:

- _Tied to a specific editing experience_: Today you can't easily use the same content model for creating different editor experiences, e.g. using a different set of field groups, or different field descriptions across different contexts.
- _Coupled with the browser runtime_: Traditional Sanity schemas defines presentation concerns like custom input components, preview configs and field labels that often includes React and browser libraries. Unless taking extra precautions, this can often lead to issues when attempting to share the schema across different runtimes and execution environments.
- _Limited composability and re-use_: Sharing data models or aspects of a data model between different parts of an organization is challenging today, can often make it hard to reason about impact of making a change, and introduce far-reaching changes with unintended consequences. With the benefit of statical type checking, schemas can be published to npm, versioned with semver and will give early compile-time errors stopping accidental breakage from reaching production.

The composability of Sanitype combined with runtime validation provides several added advantages:

- Different versions of the same content model can live side by side, extending or composing of each other. You can create a variant of a type that omits a particular field, or you can create a ProductV2 type that renames the `client`-field to `customer`.
- When importing content from an external system into Sanity, you can use the schema to validate that the external content adheres to the shape defined by the schema, preventing invalid or unexpected data from entering the Sanity Data store.

### Type-level "Sanity-isms"

Sanity is extremely flexible, but is also opinionated about certain aspects of your content model, for example:

1. Object types automatically gets assigned persistent keys ( `_key: string`) when they're contained in arrays. With Sanitype, this is handled at the type level, so no need for `arrayItem as T & {_key: string}`
2. Document types automatically gets assigned system properties like `_rev: string, _createdAt`, etc.
3. Document lifecycles can be reflected at the type level:
   - A document fetched from the API will always have `_id`, `_rev`. For documents created client side, these are optional, and can be undefined.
   - All properties of a draft document will be optional/nullable, since drafts are partial in nature.
   - A published document will have passed validation, and thus have all required fields (no need for non-null assertions)

### Type Safe Content Migrations

Sanitype schemas are highly composable. I.e. you can create a base schema that can be extended in different contexts or represent different versions of the same content model. This enables a migration strategy that allows different versions of a schema can coexist side by side in a transition period, enabling incremental content migrations without breaking frontends or client applications.

### Why not just use Zod?

[Zod](https://zod.dev/) is great, and we have been long-time adopters and fans here at Sanity. However, zod has a much broader scope, and supports JavaScript types that can't be represented in a Sanity document like Set, Map, Promise, functions, etc.

## Getting started

### Requirements

Sanitype requires TypeScript 5.x and strict mode to be enabled in `tsconfig.json`:

```
{
  // ...
  "compilerOptions": {
    // ...
    "strict": true
  }
}

```

### Install

### npm

```sh
npm install @sanity/sanitype
```

### pnpm

```sh
pnpm add @sanity/sanitype
```

### bun

```sh
bun add @sanity/sanitype
```

### yarn

```sh
yarn add @sanity/sanitype
```

## Usage examples

### Basic example

Creating a simple document type

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
} from '@sanity/sanitype'

// define and export a user schema
export const userSchema = document({
  _type: literal('user'),
  name: string(),
  union: union([string(), number()]),
  optional: optional(boolean()),
  nested: object({
    foo: optional(string()),
  }),
})

// export the User type inferred from the userSchema
export type User = Infer<typeof userSchema>

// Use it to validate that a value is compatible with the schema
const user = parse(userSchema, {
  _type: 'user',
  name: 'Grace Hopper',
  union: 'this is a string, but could also be number',
  optional: true,
  nested: {
    foo: 'bar',
  },
})

// 💥 type error
// TS2339: Property noSuchProperty does not exist on type
user.noSuchProperty

// 💥 type error
// TS2365: Operator + cannot be applied to types {foo?: string | undefined;} and number
user.nested + 2
```

### Extending types

Extending document or object types is as easy as using everyday JavaScript:

```ts
const baseFields = {name: string(), other: string()}
const baseType = object(baseFields)

const extendedType = object({...baseFields, extendedField: string()})
```

#### The `extend()` helper

There's also an `extend()` utility function that can extend any object or document type:

```ts
const baseType = object({name: string(), other: string()})

const extendedType = extend(baseType, {extendedField: string()})
```

### Pick & omit fields

You can create define your own types by picking or omitting sets of fields from other types

```ts
const someSchema = object({
  name: string(),
  other: string(),
  irrelevant: number(),
})

// create a new type without the `irrelevant` field
const example1 = omit(someSchema, ['irrelevant'])

// in effect the same as above, but explicitly picking the fields to keep
const example2 = pick(someSchema, ['name', 'other'])
```

### Lifecycle and type transforms

Sanitype supports various utilities to create different variations of a type. For example, if using a schema to let users fill in a form, you want the type to allow for optional values (since users typically fill in forms gradually). However, you don't want to allow for this by making every field optional on your data type, and you still want a type you can validate against to check if the user have filled in all required fields. For these scenarios, Sanitype provides the following utilities:

- `shallowPartial()` - makes all fields of an object type optional (i.e. nullable)
- `shallowRequired()` - makes all fields of an object type required (i.e. non-nullable).
- `deepPartial()` - recursively makes all fields of an object type optional (i.e. non-nullable).
- `deepRequired()` - recursively makes all fields of an object type optional (i.e. non-nullable).

```ts
// Note that all fields are required in this type
const contactDetails = object({
  name: string(),
  address: string(),
  email: string(),
})
const optionalContactDetails = deepPartial(contactDetails)

// This would be the type to validate against
type ValidContactDetails = Infer<typeof contactDetails>

// This would be the type to use when working with partial data, e.g. as a user fills in the contact details form
type OptionalContactDetails = Infer<typeof optionalContactDetauls>
```

#### Recursive types

You can define a recursive schema in Sanitype using the `lazy()` type helper, but due to a limitation in TypeScript, its type cannot be automatically inferred. To work around this, you’ll need to manually define the type and provide it as a "type hint".

```ts
interface Person {
  _type: 'person'
  name: number
  parent: Person & {foo: string}
}

const personSchema: SanityObjectType<Person> = object({
  _type: literal('person'),
  name: lazy(() => number()),
  foo: literal('ok'),
  parent: lazy(() => extend(personSchema, {foo: string()})),
})
```

#### Document lifecycles

Sanitype also exports helpers to represent a Sanity Document at different stages, e.g.:

- published (schemas are modelled as published)
- draft
- stored (e.g. retrieved from the data store)
- variations of the above (e.g. a stored draft)

```ts
import {type Infer} from '@sanity/sanitype'
import {document, draft, literal, parse, stored, string} from '@sanity/sanitype'

// The schema for the myDocument type in its "ideal" form (i.e. published/validated state)
const myDocument = document({
  _type: literal('pet'),
  name: string(),
})

// Schema for myDocument as draft
const myDocumentDraft = draft(myDocument)

// Schema for myDocument as stored
const myDocumentStored = stored(myDocument)
const storedMyDocument = parse(myDocumentStored, {/* input */})
// _rev is defined because it's stored!
console.log(storedMyDocument._rev.toUpperCase())

// Schema for myDocument as a stored draft
const myDocumentStoredDraft = stored(myDocumentDraft)
const storedDraft = parse(myDocumentStoredDraft, {/* input */})

// _id is defined because it's stored!
console.log(storedDraft._id.toUpperCase())

// Inferred TypeScript type of myDocument (default is published)
type MyDocument = Infer<typeof myDocument>
// Can create a new instances of published without having to provide _id, _rev, etc.
// but still need to provide required fields
const somePublished: MyDocument = {
  _type: 'pet',
  name: 'someName',
}

// Inferred TypeScript type of myDocument as draft
type MyDocumentDraft = Infer<typeof myDocumentDraft>

// Can create a new instances of drafts without having to provide required attributes
const someDraft: MyDocumentDraft = {
  _type: 'pet',
}
```

## Limitations & gotchas

Static types only works schema generation works as far as TypeScript can infer

For example, generate types dynamically like this is _not_ supported:

```typescript
const strings = ['firstName', 'lastName']
const shape = {}
strings.forEach(key => {
  shape[key] = string()
})

const schema = s.object(shape)

// type of value will be {}
const value = schema.parse({
  firstName: 'Bjørge',
  lastName: 'Næss',
})
```

The inferred static type here will be limited to `{}` (note: the parser will still work as expected)

To reap the full benefit of static typing, it's recommended to write your schemas in a way that TypeScript can infer as narrow types as possible, e.g.:

```typescript
const shape = {
  firstName: string(),
  lastName: string(),
}
const schema = object(shape)

// inferred type of value will be {firstName: string, lastName: string}
const value = parse(schema, {
  firstName: 'Bjørge',
  lastName: 'Næss',
})
```

## API

(TODO)

### Data types

#### Primitives

#### Literal

#### Unions

#### Objects

#### Arrays

#### References

#### Portable text

#### Recursive types

### Utilities

#### Extend

#### Optional

#### Required

#### Omit

#### Pick

#### Rename

### GraphQL Strict mode

## Development

Clone this repository

```
git clone git@github.com:sanity-io/sanitype.git
```

Install dependencies

```sh
pnpm install
```

Take a look at the examples in the `examples` folder (feel free to create your own example and push to a branch, e.g. to illustrate a bug, lacking feature, or something that's hard to solve with this approach compared to current day schemas)

An example of a vanilla Sanity Studio using sanitype-schemas can be found in `examples/compat-studio`. Start with:

```
npm run example:compat-studio
```

Useful scripts:

```sh
pnpm dev        # build, typecheck and test in watch mode
pnpm test       # run tests (incl. type tests)
pnpm typecheck  # tsc
pnpm lint       # oxlint
pnpm format     # oxfmt
pnpm check      # everything CI runs
```

### Releasing

Releases are managed with [changesets](https://github.com/changesets/changesets). Add a changeset together with any user-facing change:

```sh
pnpm changeset
```

When merged to `main`, a "chore: release" pull request is opened automatically. Merging it bumps the version, updates `CHANGELOG.md` and publishes to npm.

## Acknowledgements & inspiration

This implementation is heavily inspired by [zod](https://zod.dev), which popularized runtime schemas with static type inference.
