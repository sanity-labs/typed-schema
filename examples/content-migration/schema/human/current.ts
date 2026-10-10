import {
  array,
  document,
  type Infer,
  literal,
  number,
  object,
  string,
} from '@sanity-labs/typed-schema'

export type Human = Infer<typeof Human>

export const Address = object({
  city: string(),
  country: string(),
})

export const Human = document({
  _type: literal('human'),
  name: string(),
  birthYear: number(),
  addresses: array(Address),
})

export const Pet = document({
  _type: literal('pet'),
  name: string(),
})
