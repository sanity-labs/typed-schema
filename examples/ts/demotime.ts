import {
  array,
  document,
  type Infer,
  literal,
  number,
  object,
  parse,
  reference,
  string,
  union,
} from '@sanity-labs/typed-schema'

const Human = document({
  _type: literal('human'),
  name: object({first: string(), last: string()}),
})

const Pet = document({
  _type: literal('pet'),
  name: string(),
  union: union([string(), number()]),
  humans: array(union([reference(Human)])),
})

const somePet = parse(Pet, {})

type Pet = Infer<typeof Pet>

if (somePet.ok) {
  const someHuman = somePet.value.humans[0]
}
