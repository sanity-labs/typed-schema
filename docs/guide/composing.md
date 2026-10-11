# Composing schemas

Shapes are plain objects, and schemas can be derived from other schemas. Each transform below returns a new schema, and the inferred types follow.

## Adding fields

There are two ways to add fields to an existing schema: spread its shape into a new one, or use `extend`. Both give the same fields, and in both a field with the same name as an existing one replaces it. `extend` also keeps the schema's [annotations](./annotations) apart from `examples`, while a spread starts a new schema without any:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Person = s.object({
  name: s.string(),
  email: s.string(),
  phone: s.optional(s.string()),
})

const Volunteer = s.object({...Person.shape, role: s.string()})

type Volunteer = s.Infer<typeof Volunteer>
//   ^?

const Speaker = s.extend(Person, {talk: s.string()})

type Speaker = s.Infer<typeof Speaker>
//   ^?
```

Use `extend` when the new fields include a getter for a [recursive schema](./recursive-schemas): spreading a shape into the same object literal as a getter breaks type inference.

## Removing fields with `omit`

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Person = s.object({
  name: s.string(),
  email: s.string(),
  phone: s.optional(s.string()),
})

// leave out the phone number where people are listed publicly
const PublicPerson = s.omit(Person, ['phone'])

type PublicPerson = s.Infer<typeof PublicPerson>
//   ^?
```

## Keeping fields with `pick`

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Person = s.object({
  name: s.string(),
  email: s.string(),
  phone: s.optional(s.string()),
})

const Contact = s.pick(Person, ['name', 'email'])

type Contact = s.Infer<typeof Contact>
//   ^?
```

`omit` and `pick` on a document keep the system fields (`_id`, `_rev`, ...) even if you list them.

## Changing the type name with `rename`

`rename` replaces a schema's `_type` literal:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Writer = s.object({_type: s.literal('writer'), name: s.string()})

type Writer = s.Infer<typeof Writer>
//   ^?

const Author = s.rename(Writer, 'author')

type Author = s.Infer<typeof Author>
//   ^?
```
