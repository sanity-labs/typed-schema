# Declaring a document

`document()` declares a document type. Its fields are schemas made with the other creators, and `Infer` turns the result into a TypeScript type.

```ts twoslash
// @errors: 2551
import * as s from '@sanity-labs/typed-schema'

export const User = s.document({
  _type: s.literal('user'),
  name: s.string(),
  idOrHandle: s.union([s.string(), s.number()]),
  isAdmin: s.optional(s.boolean()),
  address: s.object({
    city: s.optional(s.string()),
  }),
})

export type User = s.Infer<typeof User>

const result = s.parse(User, {
  _type: 'user',
  name: 'Grace Hopper',
  idOrHandle: 'grace',
  isAdmin: true,
  address: {city: 'Arlington'},
})

if (result.ok) {
  const user = result.value

  user.address
  //   ^?

  // a typo in a field name is a type error
  user.adress
}
```

Schema constants are PascalCase (`User`, `Address`), the same as the type inferred from them. TypeScript lets a `const` and a `type` share a name, so `User` is the schema in a value position and the parsed document type in a type position, and one import gives you both. Creator and transform functions (`document()`, `reference()`, `extend()`) stay camelCase, and `_type` literals keep Sanity's camelCase type names (`'user'`).

A document schema needs a `_type` literal. `document()` adds the optional system fields `_id`, `_rev`, `_createdAt` and `_updatedAt`. Use `object()` for nested objects; give it a `_type` literal when the object is a member of a union.

See the [API reference](/api/schema-types) for every creator.
