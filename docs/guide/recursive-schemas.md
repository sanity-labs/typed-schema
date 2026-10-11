# Recursive schemas

Declare a field that refers to its own schema, or to a schema defined further down, with a getter, the same way as in [Zod](https://zod.dev/api#recursive-objects). TypeScript infers the type without annotations:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Person = s.document({
  _type: s.literal('person'),
  name: s.string(),
  get friends() {
    return s.array(s.reference(Person))
  },
})

type Person = s.Infer<typeof Person>
//   ^?
```

This also works for mutual recursion (a `User` with posts, each `Post` with an author), through `optional()` and `union()`, and in the fields passed to `extend()`.

The schema creators store the getter as a `lazy()` schema without calling it, so `Person.shape.friends` is a `lazy` schema at runtime even though its static type is the array schema. For the same reason, TypeScript does not check that a getter returns a schema. If it returns something else, parsing throws `Field "friends" is not a schema` the first time it reaches that field.

## When inference fails

Spreading another shape into the same object literal as a getter makes TypeScript read the getter while it infers the schema, and the schema becomes `any` with error TS7022 ("implicitly has type 'any' because it does not have a type annotation"):

```ts twoslash
// @errors: 7022 7023
import * as s from '@sanity-labs/typed-schema'

const CategoryFields = s.object({title: s.string()})

const Category = s.object({
  ...CategoryFields.shape,
  get subcategories() {
    return s.array(Category)
  },
})
```

Add the getter with `extend` instead:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const CategoryFields = s.object({title: s.string()})

const Category = s.extend(CategoryFields, {
  get subcategories() {
    return s.array(Category)
  },
})

type Category = s.Infer<typeof Category>
//   ^?
```
