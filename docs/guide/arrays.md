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

An array schema's `element` is the element schema with `_key` added. Use it to parse or type one array item:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Address = s.object({city: s.string()})
const Addresses = s.array(Address)

type AddressItem = s.Infer<typeof Addresses.element>
//   ^?

// {ok: true, value: {city: 'Oslo', _key: 'a1'}}
s.parse(Addresses.element, {city: 'Oslo', _key: 'a1'})
```

The other way round, `element.unkeyed` is the schema given to `array()`, without `_key`. This is useful when the array is declared inline, as a field of another schema:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Recipe = s.document({
  _type: s.literal('recipe'),
  ingredients: s.array(s.object({name: s.string(), grams: s.number()})),
})

const Ingredient = Recipe.shape.ingredients.element.unkeyed

type Ingredient = s.Infer<typeof Ingredient>
//   ^?
```

## Restrictions

Sanity does not allow arrays that mix primitives and objects, or arrays of arrays. Both are type errors:

```ts twoslash
// @errors: 2769
import * as s from '@sanity-labs/typed-schema'

const Dish = s.object({
  _type: s.literal('dish'),
  name: s.string(),
  vegetarian: s.boolean(),
})

const Mixed = s.array(s.union([s.string(), Dish]))

// a menu as a list of sections, each a list of dishes
const Menu = s.array(s.array(Dish))
```

To nest arrays, wrap each inner array in an object. The menu becomes a list of sections, each section an object holding its dishes:

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
