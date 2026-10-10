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

const human: SanityDocumentType<Human> = document({
  _type: literal('human'),
  name: object({first: string(), last: string()}),
  coworkers: lazy(() => array(reference(human))),
})

// todo: fetch a human
const knut = await loadDocument(human, 'knut')

// todo: make a "pet" document schema
// todo: make the pet have a reference to it's human
const pet = document({
  _type: literal('pet'),
  name: string(),
  human: reference(human),
})
// todo: fetch a pet
const jara = await loadDocument(pet, 'jara')

// todo: resolve the pet's human
const jarasHuman = loadReference(jara.human)

// todo: make the human have a list of coworkers

// todo: fetch all the pet's human's coworkers
const coworkers = await Promise.all(
  (await loadReference(jara.human)).coworkers.map(coworker =>
    loadReference(coworker),
  ),
)
