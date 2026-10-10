import {
  array,
  extend,
  type Infer,
  number,
  omit,
  string,
} from '@sanity-labs/typed-schema'

import * as current from './current'

export const Human = extend(omit(current.Human, ['birthYear', 'addresses']), {
  age: number(),
  oldTemporaryField: string(),
  address: array(current.Address),
})

export type Human = Infer<typeof Human>

export const Pet = current.Pet
