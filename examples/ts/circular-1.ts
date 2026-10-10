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
  name: {
    first: string
    last: string
  }
  coworkers: SanityArrayValue<SanityReferenceValue<Human>>
}

const Human: SanityDocumentType<Human> = document({
  _type: literal('human'),
  name: object({first: string(), last: string()}),
  coworkers: lazy(() => array(reference(Human))),
})

// todo: fetch a human
const knut = await loadDocument(Human, 'knut')

// todo: make a "pet" document schema
// todo: make the pet have a reference to its human
const Pet = document({
  _type: literal('pet'),
  name: string(),
  human: reference(Human),
})
// todo: fetch a pet
const jara = await loadDocument(Pet, 'jara')

// todo: resolve the pet's human
const jarasHuman = loadReference(jara.human)

// todo: make the human have a list of coworkers

// todo: fetch all the pet's human's coworkers
const coworkers = await Promise.all(
  (await loadReference(jara.human)).coworkers.map(coworker =>
    loadReference(coworker),
  ),
)
