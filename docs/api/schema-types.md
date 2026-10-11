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

## Arrays, unions and references

| Creator                                           | Notes                                                                                                                                                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `array(element)`                                  | Object-like elements get a required `_key`; primitive elements do not. Arrays of arrays are a type error                                                                                                              |
| `union([...members])`                             | All primitives (including literals and dates) or all typed objects, references, images, files and blocks. Nested unions are flattened                                                                                 |
| `objectArray(element)`, `primitiveArray(element)` | `array()` for one kind of element: `array()` picks between them from the element schema                                                                                                                               |
| `getUnkeyedSchema(element)`                       | The element schema as given to `array()`, without the `_key` field `array()` adds                                                                                                                                     |
| `reference(doc)`                                  | `{_type: 'reference'; _ref: string; _weak?: boolean}`. In `Parsed<>` the value also includes the referenced schema as `$refSchema`, which `loadReference` uses. It is not serialized, and it is absent from `Infer<>` |

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Author = s.document({_type: s.literal('author'), name: s.string()})

type Author = s.Infer<typeof Author>

const Content = s.array(
  s.union([
    s.object({_type: s.literal('quote'), text: s.string()}),
    s.reference(Author),
  ]),
)

type Content = s.Infer<typeof Content>
//   ^?
```

See [Arrays and `_key`](/guide/arrays) for how keys are added.

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
