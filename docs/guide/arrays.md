# Arrays and `_key`

An array holds either primitive values or object-like values. Sanity requires every object in an array to have a `_key`, so `array()` adds `_key: string` to the type of object elements.

## Arrays of primitives

Arrays of strings, numbers, booleans, dates and literals hold plain values, without keys:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Tags = s.array(s.string())

type Tags = s.Infer<typeof Tags>
//   ^?
```

## Arrays of objects

Declare the object without a `_key`, and `array()` adds one to the element type. This applies to every object-like element: objects, references, images, files, blocks and unions of those.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Address = s.object({city: s.string()})

type Address = s.Infer<typeof Address>
//   ^?

const Addresses = s.array(Address)

type Addresses = s.Infer<typeof Addresses>
//   ^?
```

The key belongs to the array, not to the object schema, and it is not generated. Parsing an array requires each element to have one:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Address = s.object({city: s.string()})
const Addresses = s.array(Address)

// on its own, an address needs no key:
// {ok: true, value: {city: 'Oslo'}}
s.parse(Address, {city: 'Oslo'})

// in an array, every element needs one. The result is {ok: false, error},
// and error.issues is
// [{path: [0], code: 'ARRAY_ELEMENT_NOT_KEYED_OBJECT', ...}]
s.parse(Addresses, [{city: 'Oslo'}])
```

## Element schemas

An array schema's `element` is the element schema with `_key` added, and `element.unkeyed` is the schema given to `array()`. Use them to parse or type one item, or to get the item type of an array declared inline. See [`array()`](/api/schema-types#array) for examples.

## Nesting arrays

Sanity does not allow arrays of arrays, so `array(array(Dish))` is a type error. The [`array()` reference](/api/schema-types#array) lists the other elements an array can't have.

To nest arrays, wrap each inner array in an object. A menu becomes a list of sections, each section an object holding its dishes:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Dish = s.object({
  _type: s.literal('dish'),
  name: s.string(),
  vegetarian: s.boolean(),
})

const MenuSection = s.object({
  _type: s.literal('menuSection'),
  title: s.string(),
  dishes: s.array(Dish),
})

const Menu = s.array(MenuSection)

type Menu = s.Infer<typeof Menu>
//   ^?
```
