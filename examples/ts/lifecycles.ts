import {
  committed,
  document,
  type Infer,
  literal,
  parse,
  partial,
  string,
} from '@sanity-labs/typed-schema'

// The base schema is a complete pet as you construct it locally. The system
// fields are optional because nothing has assigned them yet.
const Pet = document({
  _type: literal('pet'),
  name: string(),
})
type Pet = Infer<typeof Pet>

const pet: Pet = {_type: 'pet', name: 'Fido'}

// Completeness: partial() relaxes every field but _type, recursively. This is what you
// hold while editing, or what the `drafts` and `raw` perspectives may return.
const PartialPet = partial(Pet)
type PartialPet = Infer<typeof PartialPet>

const partialPet: PartialPet = {_type: 'pet'}

// Persistence: committed() adds what the Content Lake assigns on commit.
const CommittedPet = committed(Pet)
const committedPet = parse(CommittedPet, {/* input */})
// _rev is a string, not string | undefined, because the document is committed
console.log(committedPet._rev.toUpperCase())

// The two compose. A committed document that may be incomplete:
const CommittedPartialPet = committed(PartialPet)
const committedPartialPet = parse(CommittedPartialPet, {/* input */})
// _id is a string because the document is committed
console.log(committedPartialPet._id.toUpperCase())
// name may be missing because the document is incomplete
console.log(committedPartialPet.name?.toUpperCase())

console.log(pet, partialPet)
