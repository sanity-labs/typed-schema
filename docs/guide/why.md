# Why typed schemas

## Constraints checked at compile time

Sanity accepts almost any shape of content, but it does have rules. A classic Sanity schema reports violations of those rules at runtime, usually when the Studio reloads during development. With typed schemas the same violations are type errors in your editor and in `tsc`:

1. Arrays of arrays.
2. Arrays that mix primitive values and objects.
3. Unions of untyped objects. Object unions must consist of objects with a `_type` literal, because a partially edited object (an empty one, say) is otherwise impossible to match to a schema type during real-time collaboration.
4. Field names that start with an underscore. These are reserved for system fields.
5. Field names that don't start with a letter A-Z, or that contain anything other than letters A-Z, digits and underscores (a hyphen, for example).
6. Field values that are not schemas, such as `title: 'Title'` instead of `title: s.string()`.
7. Documents without a `_type` literal, and document `_id` fields that are not strings.

```ts twoslash
// @errors: 2322 2769
import * as s from '@sanity-labs/typed-schema'

// arrays of arrays are not allowed, such as rows of seats
const Seating = s.array(s.array(s.string()))

// arrays can't mix primitives and objects
const Mixed = s.array(
  s.union([s.string(), s.object({_type: s.literal('link'), href: s.string()})]),
)

// object union members need a _type literal
const LinkOrNote = s.union([
  s.object({url: s.string()}),
  s.object({text: s.string()}),
])

const Person = s.object({
  // fields starting with _ are reserved for system fields
  _nickname: s.string(),
  // field names can't contain spaces or other special characters
  'first name': s.string(),
})
```

Each error names a `SchemaError` that says what to fix. For the `'first name'` field:

```
Type 'StringSchema' is not assignable to type 'StringSchema & SchemaError<"Field name 'first name' can only contain letters A-Z, digits and underscores">'.
```

The [playground](/playground) shows these errors as you type.

## Sharing a content model outside the Studio

A classic Sanity schema mixes the content model with presentation: input components, previews, field groups and titles. That makes the schema hard to use outside the Studio and hard to reuse across teams.

A typed schema is plain data describing content only. It can be:

- published to npm and versioned with semver, so a breaking change to a shared type fails the downstream build instead of failing in production,
- used in any runtime (Node, edge, browser) without pulling in React,
- used to validate content coming from another system before it is written to Sanity.

Several variants of one type can live side by side: an `EventV2` that renames `organizer` to `host`, or a type with one field removed for a specific context.

## Sanity conventions at the type level

Sanity attaches data to your content that you did not declare. Typed schemas model it:

1. Objects inside arrays get a `_key: string`. The inferred array element type includes it, so there is no `item as T & {_key: string}`.
2. Documents get `_id`, `_rev`, `_createdAt` and `_updatedAt`.
3. Whether a document is complete and whether it has been committed to the Content Lake are two separate questions, and each has its own transform. A document fetched from the API always has `_id`, `_rev`, `_createdAt` and `_updatedAt`; one you construct locally does not yet. A document read from the `drafts` perspective, or one being edited, may be missing fields. See [Document lifecycles](./lifecycles).

## Migrating content in steps

When a content model changes, the old and the new version can live side by side, with the new one derived from the old (`extend`, `omit`, `pick`, `rename`). A migration is then a function from one inferred type to the other, and the compiler checks every field of the result:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const EventV1 = s.document({
  _type: s.literal('event'),
  title: s.string(),
  organizer: s.string(),
})

// version 2 renames organizer to host
const EventV2 = s.extend(s.omit(EventV1, ['organizer']), {
  host: s.string(),
})

type EventV1 = s.Infer<typeof EventV1>
type EventV2 = s.Infer<typeof EventV2>

function adapt({organizer, ...event}: EventV1): EventV2 {
  return {...event, host: organizer}
}
```

The same function can adapt documents as they are read, so a dataset can be migrated gradually. Try the new version first, and convert from the old one only if that fails:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const EventV1 = s.document({
  _type: s.literal('event'),
  title: s.string(),
  organizer: s.string(),
})
const EventV2 = s.extend(s.omit(EventV1, ['organizer']), {
  host: s.string(),
})

type EventV1 = s.Infer<typeof EventV1>
type EventV2 = s.Infer<typeof EventV2>

function adapt({organizer, ...event}: EventV1): EventV2 {
  return {...event, host: organizer}
}
// ---cut---
// EventV1, EventV2 and adapt() are from the example above

function parseEvent(input: unknown): s.ParseResult<EventV2> {
  const v2 = s.parse(EventV2, input)
  if (v2.ok) return v2
  const v1 = s.parse(EventV1, input)
  // if the input is neither version, report how it fails to match V2
  return v1.ok ? {ok: true, value: adapt(v1.value)} : v2
}

// {ok: true, value: {_type: 'event', title: 'Book club', host: 'Ada'}}
parseEvent({_type: 'event', title: 'Book club', organizer: 'Ada'})
```

This lowers the risk of a content migration. Frontends that read documents through `parseEvent` work with the V2 shape before any content has changed, so you can ship them first and then migrate the dataset incrementally, without a moment where code and content disagree.

[`examples/content-migration`](https://github.com/sanity-labs/typed-schema/tree/main/examples/content-migration) shows a complete migration.

## Why not Zod?

[Zod](https://zod.dev/) is the inspiration for this library, and nothing here replaces it for general validation. Zod accepts values a Sanity document cannot hold (`Set`, `Map`, functions, promises) and has no notion of `_key`, `_type`, references, drafts, or the field-name rules above. This library covers the subset Sanity can store and builds those conventions in.
