# Schema annotations

A schema says what shape a value has. Annotations say what the value means and how to write a good one. Every creator except `optional()` and `never()` takes them as its last argument; `number()` takes them together with its constraints:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

export const Recipe = s.document(
  {
    _type: s.literal('recipe'),
    title: s.string({description: 'Shown as the heading on the recipe page'}),
    difficulty: s.enums(['easy', 'medium', 'hard'], {
      description: 'Used to filter the recipe list',
    }),
    servings: s.optional(
      s.number({
        min: 1,
        step: 1,
        title: 'Servings',
        description: 'How many people the recipe feeds',
        examples: [4],
      }),
    ),
    tags: s.array(s.string(), {
      description: 'Lowercase keywords for search',
      guidelines: 'One word per tag, no duplicates',
      examples: [['vegetarian', 'soup']],
    }),
    subtitle: s.optional(s.string({deprecated: 'Put it in `title` instead'})),
    slug: s.string({readOnly: true, description: 'Derived from the title'}),
  },
  {
    title: 'Recipe',
    description: 'A recipe published on the site',
    examples: [
      {
        _type: 'recipe',
        title: 'Tomato soup',
        difficulty: 'easy',
        tags: ['soup'],
        slug: 'tomato-soup',
      },
    ],
  },
)

export type Recipe = s.Infer<typeof Recipe>
```

The set of keys is closed and follows the JSON Schema annotation vocabulary, plus `guidelines`:

| Key           | What it says                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| `title`       | A short name for the value                                                                                  |
| `description` | What the value is                                                                                           |
| `guidelines`  | How to write a good one, for whoever authors it                                                             |
| `examples`    | Valid values                                                                                                |
| `deprecated`  | The reason, and what to use instead                                                                         |
| `readOnly`    | The system sets the value, such as a slug derived from the title, so editors and agents should not write it |

Annotations describe the content model, not any one consumer of it. There are no keys for how a value is rendered, which input edits it or which tool reads it, so the same annotations serve a Studio form, an agent that writes content, generated documentation and a test suite.

## Checking examples

`examples` are checked against the inferred type, so a wrong shape, a missing `_key` on an array item or a value outside an enum is a compile error:

```ts twoslash
// @errors: 2322
import * as s from '@sanity-labs/typed-schema'
// ---cut---
const Servings = s.number({examples: ['four']})
```

The type system can't see constraints such as `min` on a number or the format of a `date`. `validateExamples(schema)` parses every example in the schema tree against its node and returns a result like `parse` does. Run it in a test:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'
// ---cut---
const Recipe = s.document({
  _type: s.literal('recipe'),
  servings: s.optional(s.number({min: 1, step: 1, examples: [0, 4]})),
  published: s.date({examples: ['2026-13-01']}),
})

const result = s.validateExamples(Recipe)

if (!result.ok) {
  // Invalid schema examples:
  // servings examples[0]: Expected a number greater than, or equal to 1
  // published examples[0]: Expected a date string on the format "YYYY-MM-DD"
  console.error(result.error.message)
}
```

`validateExamplesOrThrow(schema)` returns the schema when every example parses, and throws the same `ExampleError` when one does not. The error's `failures` lists each failing example with its position in the schema and its parse issues.

## Annotations on shared schemas

Annotations belong to the schema node they are given to. An `array()` and its element are two nodes, so each can have its own. A shared schema used as a field brings its annotations with it:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'
// ---cut---
const Address = s.object(
  {street: s.string(), city: s.string()},
  {title: 'Address'},
)

const Venue = s.document({
  _type: s.literal('venue'),
  // the field has Address's title
  address: Address,
  // a new node, with its own title
  postalAddress: s.object(Address.shape, {title: 'Postal address'}),
  tags: s.array(s.string({title: 'Tag'}), {description: 'Keywords'}),
})

type Venue = s.Infer<typeof Venue>
```

To describe one use of a shared schema differently, build a new node from its shape, as `postalAddress` does. That replaces the annotations rather than merging them.

Annotations survive `extend`, `pick`, `omit`, `rename` and the partial and required transforms. The exception is `examples`: `extend`, `rename`, `shallowRequired` and `deepRequired` drop them, since the source's examples may not be valid values of the result (it can have a new required field, a different `_type` or a field that is no longer optional). `pick`, `omit` and the partial transforms keep them, because every example still parses.

## Reading annotations

`getAnnotations(schema)` returns a node's annotations, or `undefined` if it has none. It looks through `optional()` and `lazy()`, and annotations on the outer node win:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Recipe = s.document({
  _type: s.literal('recipe'),
  title: s.string({description: 'Shown as the heading on the recipe page'}),
})
// ---cut---
s.getAnnotations(Recipe.shape.title)?.description
// 'Shown as the heading on the recipe page'
```

[`toClassicSchema`](/guide/studio) maps `title`, `description`, `deprecated` and `readOnly` onto the Studio field definitions.

## Translations

Any text can be given per locale. `getAnnotations(schema, {locale, fallback})` resolves it to a string, and so does `toClassicSchema(schema, {locale})`:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'
// ---cut---
const Title = s.string({
  description: {en: 'The event title', nb: 'Tittelen på arrangementet'},
})

s.getAnnotations(Title, {locale: 'nb', fallback: 'en'})?.description
// 'Tittelen på arrangementet'
```

The library doesn't know which locales a project uses, so a locale map accepts any keys. To require your own set, narrow `AnnotationText` where the text is written. A map with a missing or misspelled locale is then a compile error:

```ts twoslash
// @errors: 2353
import * as s from '@sanity-labs/typed-schema'
// ---cut---
type Text = s.AnnotationText<'en' | 'nb'>
const t = (text: Text) => text

s.string({description: t({en: 'The event title', no: 'Tittelen'})})
```
