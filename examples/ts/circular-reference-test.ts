import {
  array,
  document,
  lazy,
  literal,
  parse,
  reference,
  type SanityDocumentValue,
  type SanityType,
  string,
} from '@sanity-labs/typed-schema'

interface Human extends SanityDocumentValue {
  name: string
}

const Human: SanityType<Human> = document({
  _type: literal('human'),
  name: string(),
  pets: lazy(() => array(reference(Pet))),
})

const Pet = document({
  _type: literal('pet'),
  name: string(),
  owner: reference(Human),
  human: Human,
})

const myPet = parse(Pet, {name: 'fido', owner: {_type: 'human', name: 'bob'}})
// @ts-expect-error - should not have _foo property
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
myPet._foo
