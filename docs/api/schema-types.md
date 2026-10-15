# Schema types

All creators are named exports of `@sanity-labs/typed-schema`.

| Creator                                         | Inferred type                                                   |
| ----------------------------------------------- | --------------------------------------------------------------- |
| [`string()`](#string)                           | `string`                                                        |
| [`number()`](#number) and its aliases           | `number`                                                        |
| [`boolean()`](#boolean)                         | `boolean`                                                       |
| [`literal()`](#literal)                         | the literal                                                     |
| [`enums()`](#enums)                             | a union of the values                                           |
| [`date()`](#date)                               | `string`                                                        |
| [`dateTime()`](#datetime)                       | `string`                                                        |
| [`object()`](#object)                           | an object with the declared fields                              |
| [`document()`](#document)                       | an object with the declared fields and the system fields        |
| [`array()`](#array)                             | an array, with `_key` on object elements                        |
| [`union()`](#union)                             | a union of the members' types                                   |
| [`reference()`](#reference)                     | `{_type: 'reference'; _ref: string; _weak?: boolean}`           |
| [`image()`](#image) and [`file()`](#file)       | `{_type: 'image' \| 'file'; asset: reference}` plus your fields |
| [`imageAsset()`, `fileAsset()`](#asset-schemas) | the `sanity.imageAsset` and `sanity.fileAsset` documents        |
| [`geopoint()`](#geopoint)                       | `{_type: 'geopoint'; lat: number; lng: number; alt?: number}`   |
| [`block()`](#block)                             | one Portable Text block                                         |
| [`portableText()`](#portabletext)               | an array of blocks and the objects between them                 |
| [`optional()`](#optional)                       | the inner type, or `undefined`                                  |
| [`lazy()`](#lazy)                               | the type of the schema the getter returns                       |
| [`never()`](#never)                             | `never`                                                         |

## Common to every schema {#common}

A schema is a plain object with these properties:

| Property      | Notes                                                                            |
| ------------- | -------------------------------------------------------------------------------- |
| `typeName`    | The kind of schema: `'string'`, `'object'`, `'objectArray'`, `'union'`, ...      |
| `annotations` | The [annotations](/api/annotations) given as the creator's last argument, if any |
| `~standard`   | The [Standard Schema](/guide/standard-schema) properties. Not enumerable         |

Every creator except `optional()` and `never()` takes [annotations](/api/annotations) as its last argument. `number()` and its aliases take them in the same object as the constraints.

`parse` leaves fields the schema does not declare out of the parsed value, and does not report them as issues. An `optional()` field set to `null` fails to parse, since `null` is not `undefined`.

## `string()` {#string}

```ts
string(annotations?): StringSchema
```

- **Inferred type:** `string`
- **Parsing:** Any string. Anything else is `INVALID_TYPE`

## `number()` {#number}

```ts
number(options?: NumberConstraints & SchemaAnnotations): NumberSchema
safeint(annotations?)
int32(annotations?)
uint32(annotations?)
float32(annotations?)
float64(annotations?)
```

- **Inferred type:** `number`
- **Parsing:** A finite number within the constraints. `NaN`, `Infinity` and anything that is not a number are `INVALID_TYPE`
- **Error codes:** `INVALID_TYPE`, `NUM_TOO_SMALL`, `NUM_TOO_BIG`, `NUM_NOT_MULTIPLE_OF`
- **Properties:** `constraints`, which holds the options other than annotations, or is `undefined` if there are none

| Option | Notes                                                                  |
| ------ | ---------------------------------------------------------------------- |
| `min`  | Smallest allowed value, inclusive                                      |
| `max`  | Largest allowed value, inclusive                                       |
| `gt`   | Smallest allowed value, exclusive                                      |
| `lt`   | Largest allowed value, exclusive                                       |
| `step` | The value must be a multiple of `step`. `step: 1` allows whole numbers |

Use `min` and `max`, or `gt` and `lt`. Mixing the two pairs is a type error.

The aliases are `number()` with a preset range:

| Alias       | Range                                           | Whole numbers |
| ----------- | ----------------------------------------------- | ------------- |
| `safeint()` | `Number.MIN_SAFE_INTEGER` to `MAX_SAFE_INTEGER` | yes           |
| `int32()`   | -2<sup>31</sup> to 2<sup>31</sup>-1             | yes           |
| `uint32()`  | 0 to 2<sup>32</sup>-1                           | yes           |
| `float32()` | ±3.4028234663852886e38                          | no            |
| `float64()` | ±`Number.MAX_VALUE`                             | no            |

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Rating = s.number({min: 1, max: 5, step: 1, title: 'Rating'})

// {ok: false, error}, with the issue code NUM_TOO_BIG
s.parse(Rating, 6)
```

## `boolean()` {#boolean}

```ts
boolean(annotations?): BooleanSchema
```

- **Inferred type:** `boolean`
- **Parsing:** `true` or `false`. Anything else is `INVALID_TYPE`

## `literal()` {#literal}

```ts
literal(value: string | number | boolean, annotations?): LiteralSchema
```

- **Inferred type:** The literal type of `value`, such as `'post'` or `42`
- **Parsing:** Only `value` itself (`===`). Anything else is `INVALID_TYPE`
- **Properties:** `value`

The `_type` field of a document or typed object is a `literal()`. A [union](#union) of literals is a closed set of values, like [`enums()`](#enums).

## `enums()` {#enums}

```ts
enums(values: string[] | {[name: string]: string | number}, annotations?): EnumSchema
```

- **Inferred type:** A union of the values
- **Parsing:** One of the values. Anything else is `INVALID_ENUM_VALUE`
- **Properties:** `enum`, the values as an object. An array of values is stored as an object that maps each value to itself

With an object, the values are the object's values, not its keys. An `enums()` can't be an array element or a union member; use a [union](#union) of literals there.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Status = s.enums(['draft', 'review', 'published'])
type Status = s.Infer<typeof Status>
//   ^?

const Priority = s.enums({Low: 1, High: 2})
type Priority = s.Infer<typeof Priority>
//   ^?
```

## `date()` {#date}

```ts
date(annotations?): DateSchema
```

- **Inferred type:** `string`
- **Parsing:** A calendar date written `YYYY-MM-DD`. `2024-02-30` and `2024-2-3` are `INVALID_TYPE`

## `dateTime()` {#datetime}

```ts
dateTime(annotations?): DateTimeSchema
```

- **Inferred type:** `string`
- **Parsing:** An ISO 8601 date and time with a time zone, `YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)`. Without a time zone it is `INVALID_TYPE`

## `object()` {#object}

```ts
object(shape: {[field: string]: Schema}, annotations?): ObjectSchema
```

- **Inferred type:** An object with a property per field. `optional()` fields are optional properties
- **Parsing:** A plain object. `parse` checks each field with its schema, and adds the field name to the path of each issue it finds. Anything that is not an object is `INVALID_TYPE`
- **Properties:** `shape`, the fields

A field declared with a getter is stored as a [`lazy()`](#lazy) schema, so a field can refer to its own schema. See [Recursive schemas](/guide/recursive-schemas).

An object with a `_type` field holding a string `literal()` is a _typed object_. An object must be typed to be a member of a [union](#union) or to be used in [Portable Text](#block).

Type errors:

- A field name that does not start with a letter A-Z, or that has characters other than letters A-Z, digits and `_`. The one exception is `_type`.
- A field value that is not a schema.

```ts twoslash
// @errors: 2322
import * as s from '@sanity-labs/typed-schema'

const Link = s.object({
  _type: s.literal('link'),
  href: s.string(),
  label: s.optional(s.string()),
})

type Link = s.Infer<typeof Link>
//   ^?

const Invalid = s.object({_internal: s.string()})
```

## `document()` {#document}

```ts
document(shape: {_type: LiteralSchema<string>; [field: string]: Schema}, annotations?): DocumentSchema
```

- **Inferred type:** The fields, plus the system fields `_id`, `_rev`, `_createdAt` and `_updatedAt`, all optional `string`s
- **Parsing:** As for [`object()`](#object). `_type` must equal the literal
- **Properties:** `shape`, the fields, including the system fields

The system fields are optional because a document you create has none of them until the Content Lake commits it. [`committed()`](/guide/lifecycles) makes them required. To require `_id`, declare it in the shape with `string()` or a string `literal()`.

Type errors, in addition to those of `object()`:

- No `_type` field, or a `_type` that is not a string `literal()`.
- An `_id` field that is not `string()` or a string `literal()`.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Recipe = s.document({
  _type: s.literal('recipe'),
  title: s.string(),
})

type Recipe = s.Infer<typeof Recipe>
//   ^?
```

See [Declaring a document](/guide/declaring-a-document).

## `array()` {#array}

```ts
array(element: Schema, annotations?): ObjectArraySchema | PrimitiveArraySchema
objectArray(element, annotations?): ObjectArraySchema
primitiveArray(element, annotations?): PrimitiveArraySchema
```

- **Inferred type:** An array of the element type. Object-like elements get a required `_key: string`
- **Parsing:** An array. `parse` checks each element with `element`. Anything that is not an array is `INVALID_TYPE`
- **Error codes:** `INVALID_TYPE`, `ARRAY_ELEMENT_NOT_KEYED_OBJECT`, and the element's codes
- **Properties:** `element`, the element schema, with `_key` added for object-like elements

`array()` picks the kind of array from the element:

- Objects, references, images, files, blocks and unions of these make an `objectArray`. Sanity requires a `_key` on every object in an array, so `array()` adds `_key` to the element schema. `parse` reports an element without a `_key` as `ARRAY_ELEMENT_NOT_KEYED_OBJECT`, with the element's index as the path. Issues inside an element have a `{_key, index}` path segment.
- Strings, numbers, booleans, dates, literals and unions of these make a `primitiveArray`, without keys. Issues inside an element have the index as their path segment.

`objectArray()` and `primitiveArray()` each accept only their own kind of element. Use them in [custom creators](/guide/custom-creators) that need one kind.

On an object array, `element.unkeyed` is the schema given to `array()`, without `_key`. Each member of a union element also has an `unkeyed`. Use `element` and `element.unkeyed` to get the item types of an array declared inline, as a field of another schema:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Recipe = s.document({
  _type: s.literal('recipe'),
  ingredients: s.array(s.object({name: s.string(), grams: s.number()})),
})

type IngredientItem = s.Infer<typeof Recipe.shape.ingredients.element>
//   ^?

const Ingredient = Recipe.shape.ingredients.element.unkeyed
type Ingredient = s.Infer<typeof Ingredient>
//   ^?
```

Type errors:

- An array as the element, as in `array(array(...))`. Sanity does not allow arrays of arrays; wrap the inner array in an object.
- A union that mixes primitives and objects.
- An `optional()` element.
- A `union()` of documents. For references to several document types, use `array(reference(union([...])))`.

```ts twoslash
// @errors: 2769
import * as s from '@sanity-labs/typed-schema'

const Dish = s.object({_type: s.literal('dish'), name: s.string()})

const Mixed = s.array(s.union([s.string(), Dish]))

const Menu = s.array(s.array(Dish))
```

See [Arrays and `_key`](/guide/arrays).

## `union()` {#union}

```ts
union(members: Schema[], annotations?): ObjectUnionSchema | DocumentUnionSchema | PrimitiveUnionSchema
```

- **Inferred type:** A union of the members' types. Nested unions are flattened, and `never()` members left out
- **Properties:** `union`, the members, without `never()`

All the members must be of one kind, which decides the kind of union:

| Members                                                    | `typeName`       | Parsing                                                                                                                                      |
| ---------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Strings, numbers, booleans, dates, date-times and literals | `primitiveUnion` | The first member that accepts the value. If none does, `INVALID_PRIMITIVE_UNION` followed by each member's issue                             |
| Typed objects, references, images, files and blocks        | `union`          | The member whose `_type` literal equals the value's `_type`. A value without a `_type`, or with one no member has, is `INVALID_OBJECT_UNION` |
| Documents, and `lazy()` documents                          | `documentUnion`  | As for typed objects                                                                                                                         |

A union of documents is the target of a [reference](#reference) to several document types. It can also parse a value that can be one of several documents, such as a query result: `parse(union([Author, Book]), doc)`. It can't be an array element.

Every reference value has `_type: 'reference'`, so a union cannot tell several references apart by `_type`. `union()` combines several `reference()` members into one reference to a union of their documents: `union([reference(Author), reference(Book), Link])` is `union([reference(union([Author, Book])), Link])`. It throws if one of those references, or a nested `union()` that contains one, has annotations; annotate a single `reference(union([...]))` instead.

For the inferred type to match, `union()` needs to count the references. It can for members written inline, but not for a variable, which TypeScript types as an array of unknown length. Pass members that include a `reference()` inline, or declare the variable with `as const`:

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

Type errors:

- Members of different kinds, such as a `string()` and an object, or a document and an object.
- An object member without a `_type` literal.
- A `lazy()` member that is not a document.
- A member typed as `Schema<Value>`. Type it as `DocumentSchemaOf<Value>` or `ObjectSchemaOf<Value>`.
- References in a variable that is not `as const`, as above.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Content = s.union([
  s.object({_type: s.literal('quote'), text: s.string()}),
  s.object({_type: s.literal('link'), href: s.string()}),
])

type Content = s.Infer<typeof Content>
//   ^?

const Id = s.union([s.string(), s.number()])

type Id = s.Infer<typeof Id>
//   ^?
```

## `reference()` {#reference}

```ts
reference(target: DocumentSchema | DocumentUnionSchema | LazySchema, annotations?): ReferenceSchema
```

- **Inferred type:** `{_type: 'reference'; _ref: string; _weak?: boolean}`
- **Parsing:** As for [`object()`](#object), with the fields above. Other reference fields, such as `_strengthenOnPublish`, are left out
- **Properties:** `referenceType`, the target, and `shape`, the reference fields

`target` is a document, a `lazy()` document, or a `union()` of documents. `reference(union([Author, Book]))` can point to either type, and is the same as `union([reference(Author), reference(Book)])`. For documents that reference each other, declare the field with a getter; see [Recursive schemas](/guide/recursive-schemas).

The value `parse` returns has the target under a non-enumerable `$refSchema` key, which [`loadReference`](/guide/loaders) uses to parse the referenced document. `Parsed<>` includes it and `Infer<>` leaves it out.

Type errors:

- A target that is not a document or a union of documents.

`reference()` also throws when it is created, for:

- An empty `union([])`.
- A target typed as `Schema<Value>` that is an object at runtime.
- A union with two documents of the same `_type`.

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

See [Loading documents and references](/guide/loaders).

## `image()` {#image}

```ts
image(shape?, annotations?): ImageSchema
```

- **Inferred type:** `{_type: 'image'; asset: reference to imageAsset}` plus the fields in `shape`
- **Parsing:** As for [`object()`](#object). `asset` is required. `hotspot` and `crop` are not declared yet, so they are left out of the parsed value
- **Properties:** `shape`, with `_type`, `asset` and your fields

`shape` takes extra fields, such as `alt`, with the same rules as `object()`.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Photo = s.image({alt: s.optional(s.string())})

type Photo = s.Infer<typeof Photo>
//   ^?
```

## `file()` {#file}

```ts
file(shape?, annotations?): FileSchema
```

- **Inferred type:** `{_type: 'file'; asset: reference to fileAsset}` plus the fields in `shape`
- **Parsing:** As for [`object()`](#object). `asset` is required
- **Properties:** `shape`, with `_type`, `asset` and your fields

## `imageAsset()` and `fileAsset()` {#asset-schemas}

```ts
imageAsset(annotations?): DocumentSchema<ImageAssetShape>
fileAsset(annotations?): DocumentSchema<FileAssetShape>
```

The `sanity.imageAsset` and `sanity.fileAsset` documents, which the `asset` reference of an `image()` or `file()` points to. Both have `url`, `path`, `assetId`, `extension`, `mimeType`, `sha1hash` and `size`. Their optional fields are `originalFilename`, `uploadId`, `label`, `title`, `description`, `altText`, `creditLine` and `source`.

An image asset also has `metadata`, with `dimensions`, `hasAlpha` and `isOpaque`. Its `location`, `palette`, `lqip` and `blurHash` are optional, since Sanity can't extract them from every image (an SVG has no palette, for example).

Use them to parse asset documents, or as reference targets.

## `geopoint()` {#geopoint}

```ts
geopoint(annotations?)
```

- **Inferred type:** `{_type: 'geopoint'; lat: number; lng: number; alt?: number}`
- **Parsing:** As for [`object()`](#object)

## `block()` {#block}

```ts
block(options: BlockOptions, annotations?): BlockSchema
```

- **Inferred type:** One Portable Text block: `{_type: 'block'; children; style?; listItem?; level?; markDefs?}`
- **Parsing:** As for [`object()`](#object), with the fields above
- **Properties:** `shape`, with `_type`, `style`, `listItem`, `level`, `children` and `markDefs`

| Option       | Takes                                                      | What it allows                                                                          |
| ------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `style`      | A string `literal()` or a union of them                    | Block styles, such as `normal` and `h2`. Any string if left out                         |
| `list`       | A string `literal()` or a union of them                    | List item types for `listItem`, such as `bullet` and `number`. Any string if left out   |
| `decorator`  | A string `literal()` or a union of them                    | Decorators, such as `strong` and `em`. Spans don't check them: `marks` stays `string[]` |
| `inline`     | A typed object, reference, image, file or a union of these | Objects that can sit among the spans in `children`, such as mentions                    |
| `annotation` | A typed object, reference, image, file or a union of these | Objects in `markDefs`, such as links, which spans refer to by `_key` in `marks`         |
| `_type`      | A string `literal()`                                       | The block's type name, `block` by default                                               |

`children` holds spans, `{_type: 'span'; _key: string; text: string; marks: string[]}`, and the `inline` objects. `marks` holds both decorator names and the `_key`s of entries in `markDefs`, so it is a `string[]`. Pass `{}` for a block with no options.

Sanity Studio's own schema types allow only objects and references for `inline` and `annotation`.

Type errors:

- An option not in the table, or a value of the wrong kind for an option.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const ArticleBlock = s.block({
  style: s.union([s.literal('normal'), s.literal('h2')]),
  list: s.literal('bullet'),
  decorator: s.union([s.literal('strong'), s.literal('em')]),
  annotation: s.object({_type: s.literal('link'), href: s.string()}),
})

type ArticleBlock = s.Infer<typeof ArticleBlock>
//   ^?
```

See [Portable Text](/guide/portable-text).

## `portableText()` {#portabletext}

```ts
portableText({block, element}, annotations?): ObjectArraySchema
```

- **Inferred type:** An array of blocks and `element` objects, each with `_key`
- **Parsing:** As for [`array()`](#array) of a [`union()`](#union) of typed objects
- **Properties:** As for [`array()`](#array)

| Option    | Takes                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| `block`   | A `block()` schema                                                                                                  |
| `element` | The objects allowed between blocks: a typed object, reference, image, file, a union of these, or `never()` for none |

`portableText({block, element})` is `array(union([block, element]))`. With nothing between the blocks, `array(block)` is the same.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Body = s.portableText({
  block: s.block({style: s.union([s.literal('normal'), s.literal('h2')])}),
  element: s.union([
    s.image({alt: s.string()}),
    s.object({_type: s.literal('codeBlock'), code: s.string()}),
  ]),
})

type Body = s.Infer<typeof Body>
//   ^?
```

## `optional()` {#optional}

```ts
optional(schema: Schema): OptionalSchema
```

- **Inferred type:** The type of `schema`, or `undefined`. In an object, the field is an optional property
- **Parsing:** `undefined` or a missing field, or a value `schema` accepts. `null` is not accepted
- **Properties:** `type`, the inner schema

`optional()` takes no annotations; annotate the inner schema. [`required()`](/api/transforms#modifiers) removes it. An array element can't be optional.

## `lazy()` {#lazy}

```ts
lazy(getter: () => Schema, annotations?): LazySchema
```

- **Inferred type:** The type of the schema `getter` returns
- **Parsing:** Calls `getter` the first time the schema is parsed, and parses with the schema it returns
- **Properties:** `get`, the getter

A field declared with a getter is stored as `lazy()`. A recursive schema written with `lazy()` needs a type annotation and a getter does not, so prefer a getter. See [Recursive schemas](/guide/recursive-schemas).

## `never()` {#never}

```ts
never(): NeverSchema
```

- **Inferred type:** `never`
- **Parsing:** Every value is `INVALID_TYPE`

`union()` leaves `never()` members out, so it works as a placeholder member, as in `portableText({block, element: never()})`. It takes no annotations.
