import {
  array,
  extend,
  type Infer,
  number,
  omit,
  string,
} from '@sanity-labs/typed-schema'

import * as current from './current'

export const human = extend(omit(current.human, ['birthYear', 'addresses']), {
  age: number(),
  oldTemporaryField: string(),
  address: array(current.address),
})

export type Human = Infer<typeof human>

export const pet = current.pet
