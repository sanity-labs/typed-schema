# GraphQL compatibility

Sanity's GraphQL API generates one GraphQL type per `_type`, so every `_type` in a schema must map to exactly one shape. `verifyUniqueTypeNames(schema)` walks the schema and returns it unchanged, or throws a `DuplicateTypeNameError` if the same `_type` literal appears in more than one place. Wrapping a schema in it turns a duplicate into an error as soon as the module loads, in tests and in CI, instead of when you deploy the GraphQL API.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Post = s.verifyUniqueTypeNames(
  s.document({
    _type: s.literal('post'),
    author: s.object({_type: s.literal('person'), name: s.string()}),
  }),
)

type Post = s.Infer<typeof Post>
```

A second object with `_type: 'person'` anywhere in the schema makes it throw a `DuplicateTypeNameError`:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Post = s.verifyUniqueTypeNames(
  s.document({
    _type: s.literal('post'),
    author: s.object({_type: s.literal('person'), name: s.string()}),
    reviewer: s.object({_type: s.literal('person'), email: s.string()}),
  }),
)
```

The error message names the duplicated `_type` and the paths where it appears:

```txt
Duplicate type names in schema:
  _type "person" at author, reviewer
```

To use a type in more than one place, declare it once and reuse the schema. Reusing the same schema counts as one type, while two separate declarations of `person` are rejected even if their fields match, so every type has one definition:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Person = s.object({_type: s.literal('person'), name: s.string()})

type Person = s.Infer<typeof Person>

const Post = s.verifyUniqueTypeNames(
  s.document({
    _type: s.literal('post'),
    author: Person,
    reviewer: Person,
  }),
)

type Post = s.Infer<typeof Post>
```
