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

const human: SanityType<Human> = document({
  _type: literal('human'),
  name: string(),
  pets: lazy(() => array(reference(pet))),
})

const pet = document({
  _type: literal('pet'),
  name: string(),
  owner: reference(human),
  human: human,
})

const myPet = parse(pet, {name: 'fido', owner: {_type: 'human', name: 'bob'}})
// @ts-expect-error - should not have _foo property
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
myPet._foo
