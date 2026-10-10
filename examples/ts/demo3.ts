import {
  array,
  document,
  lazy,
  literal,
  object,
  reference,
  type SanityArrayValue,
  type SanityDocumentType,
  type SanityDocumentValue,
  type SanityReferenceValue,
  string,
} from '@sanity-labs/typed-schema'

import {loadDocument, loadReference} from './loader'

// todo: define a "human" document schema with name: {first, last}
interface Human extends SanityDocumentValue {
  name: {first: string; last: string}
  coworkers: SanityArrayValue<SanityReferenceValue<Human>>
}

const Human = lazy((): SanityDocumentType<Human> =>
  document({
    _type: literal('human'),
    name: object({first: string(), last: string()}),
    coworkers: array(reference(Human)),
  }),
)

// todo: fetch a human
const knut = await loadDocument(Human, 'knut')

// todo: make a "pet" document schema
const Pet = document({
  _type: literal('pet'),
  name: string(),
  human: reference(Human),
})
const jara = await loadDocument(Pet, 'jara')

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
jara.human // ok

const jarasHuman = await loadReference(jara.human)

const jarasHumansCoworkers = await Promise.all(
  jarasHuman.coworkers.map(async coworker => await loadReference(coworker)),
)
jarasHumansCoworkers.forEach(hum => {
  console.log(hum._id)
})

// todo: make the pet have a reference to its human

// todo: fetch a pet
// todo: resolve the pet's human
// todo: make the human have a list of coworkers
// todo: fetch all the pet's human's coworkers
