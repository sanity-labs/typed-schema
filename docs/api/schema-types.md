# Schema types

All functions are named exports of `@sanity-labs/typed-schema`. Every creator except `optional()` and `never()` also takes [annotations](/api/annotations) as its last argument.

## Primitives

| Creator                                                      | Inferred type                                                 | Notes                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `string()`                                                   | `string`                                                      |                                                                                |
| `number(options?)`                                           | `number`                                                      | `{min, max}` or `{gt, lt}`, plus `step`. `NaN` and infinities fail             |
| `safeint()`, `int32()`, `uint32()`, `float32()`, `float64()` | `number`                                                      | `number()` with the matching range; the integer variants require whole numbers |
| `boolean()`                                                  | `boolean`                                                     |                                                                                |
| `literal(value)`                                             | that literal                                                  | `string`, `number` or `boolean` literal                                        |
| `enums(values)`                                              | union of the values                                           | `enums(['a', 'b'])` or `enums({A: 'a', B: 'b'})`                               |
| `date()`                                                     | `string`                                                      | `YYYY-MM-DD`, validated as a calendar date                                     |
| `dateTime()`                                                 | `string`                                                      | ISO 8601 with a time zone designator                                           |
| `geopoint()`                                                 | `{_type: 'geopoint'; lat: number; lng: number; alt?: number}` |                                                                                |
| `never()`                                                    | `never`                                                       | Excluded from unions; useful as a placeholder member                           |

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Status = s.enums(['draft', 'review', 'published'])
type Status = s.Infer<typeof Status>
//   ^?

const Rating = s.number({min: 1, max: 5, step: 1})

type Rating = s.Infer<typeof Rating>
```

## Objects, documents and assets

| Creator           | Notes                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `object(shape)`   | Field names start with a letter A-Z and contain only letters A-Z, digits and `_`. `_type` is the exception, and must be a `literal()` |
| `document(shape)` | Requires a `_type` literal; adds optional `_id`, `_rev`, `_createdAt`, `_updatedAt`                                                   |
| `image(shape?)`   | `{_type: 'image'; asset: reference to imageAsset}` plus your fields                                                                   |
| `file(shape?)`    | `{_type: 'file'; asset: reference to fileAsset}` plus your fields                                                                     |
| `imageAsset()`    | The `sanity.imageAsset` document, including `metadata` (dimensions, optional palette, lqip, blurHash, location)                       |
| `fileAsset()`     | The `sanity.fileAsset` document                                                                                                       |

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Recipe = s.document({
  _type: s.literal('recipe'),
  title: s.string(),
  photo: s.image({alt: s.optional(s.string())}),
})

type Recipe = s.Infer<typeof Recipe>

type Photo = s.Infer<typeof Recipe>['photo']
//   ^?
```

## Arrays

| Creator                                           | Notes                                                                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `array(element)`                                  | Object-like elements (objects, references, images, files, blocks and unions of these) get a required `_key`; primitive elements don't. Arrays of arrays are a type error |
| `objectArray(element)`, `primitiveArray(element)` | `array()` for one kind of element. `array()` picks between them from the element schema                                                                                  |
| `getUnkeyedSchema(element)`                       | The element schema as given to `array()`, without the `_key` field that `array()` adds                                                                                   |

An `array()` element can't be `optional()`, and it can't be a `union()` of documents. For references to several document types, use `array(reference(union([...])))`.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Ingredients = s.array(s.object({name: s.string(), grams: s.number()}))

type Ingredients = s.Infer<typeof Ingredients>
//   ^?
```

See [Arrays and `_key`](/guide/arrays) for how keys are added.

## Unions

| Creator               | Notes                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `union([...members])` | All primitives (including literals and dates), all typed objects, references, images, files and blocks, or all documents. Mixing these kinds is a type error |

A union of objects tells its members apart by `_type`, so every object member needs a `_type` literal. Nested unions are flattened in the inferred type.

Every reference value has `_type: 'reference'`, so `union()` combines several `reference()` members into one reference to a union of their documents (see [References](#references)). For the inferred type to match, `union()` needs to see how many references there are. It can for members written inline, but not for a variable, which TypeScript types as an array of unknown length. Pass members that include a `reference()` inline, or declare the variable with `as const`:

```ts twoslash
// @errors: 2769
import * as s from '@sanity-labs/typed-schema'

const Author = s.document({_type: s.literal('author'), name: s.string()})
const Link = s.object({_type: s.literal('link'), href: s.string()})

s.union([s.reference(Author), Link])

const members = [s.reference(Author), Link]
s.union(members)

const tuple = [s.reference(Author), Link] as const
s.union(tuple)
```

A union of documents is the target of a reference to several document types. It can also parse a value that can be one of several documents, such as a query result: `parse(union([Author, Book]), doc)`. A document typed by its value must be typed as `DocumentSchemaOf<Value>` to be a member.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Content = s.union([
  s.object({_type: s.literal('quote'), text: s.string()}),
  s.object({_type: s.literal('link'), href: s.string()}),
])

type Content = s.Infer<typeof Content>
//   ^?
```

## References

| Creator             | Inferred type                                         |
| ------------------- | ----------------------------------------------------- |
| `reference(target)` | `{_type: 'reference'; _ref: string; _weak?: boolean}` |

`reference()` takes a document or a `union()` of documents. `reference(union([Author, Book]))` can point to either type, and is the same as `union([reference(Author), reference(Book)])`. For documents that reference each other, a document or a union member can be wrapped in `lazy()`.

Values returned by `parse` include the target under `$refSchema`, which `loadReference` uses to parse the referenced document. `Infer<>` leaves it out.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Author = s.document({_type: s.literal('author'), name: s.string()})
const Book = s.document({_type: s.literal('book'), title: s.string()})

const Review = s.document({
  _type: s.literal('review'),
  author: s.reference(Author),
  subject: s.reference(s.union([Author, Book])),
})

type Review = s.Infer<typeof Review>
//   ^?
```

See [Loading documents and references](/guide/loaders) for `loadReference`.

## Portable Text

| Creator                          | Notes                                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `block(options)`                 | One Portable Text block. Options: `style`, `list`, `decorator` (literals or unions of literals), `inline` and `annotation` (see below), `_type` (defaults to `block`) |
| `portableText({block, element})` | `array(union([block, element]))`: blocks plus the block-level objects allowed between them                                                                            |

`inline`, `annotation` and `element` each take typed objects, references, images, files or unions of these.

The inferred block type matches what Sanity stores: `style`, `listItem`, `level` and `markDefs` are optional, `children` holds spans (`{_type: 'span'; text; marks: string[]}`) and inline objects. Unconfigured `style` and `list` accept any string.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Body = s.portableText({
  block: s.block({
    style: s.union([s.literal('normal'), s.literal('h1'), s.literal('h2')]),
    list: s.union([s.literal('bullet'), s.literal('number')]),
    decorator: s.union([s.literal('strong'), s.literal('em')]),
    annotation: s.object({_type: s.literal('link'), href: s.string()}),
  }),
  element: s.union([
    s.image({alt: s.string()}),
    s.object({_type: s.literal('codeBlock'), code: s.string()}),
  ]),
})

type Body = s.Infer<typeof Body>
//   ^?
```
