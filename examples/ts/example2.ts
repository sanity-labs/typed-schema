import {
  array,
  createReferenceLoader,
  document,
  type Infer,
  literal,
  optional,
  parse,
  reference,
  string,
} from '@sanity-labs/typed-schema'

const pet = document({_type: literal('pet'), name: string()})

declare const petOutput: Infer<typeof pet>

const person = document({
  _type: literal('person'),
  firstName: string(),
  lastName: optional(string()),
  favoritePet: reference(pet),
  pets: array(reference(pet)),
})

declare const personOutput: Infer<typeof person>

type Person = Infer<typeof person>

const aPerson = parse(person, {})
const resolve = createReferenceLoader(async () => {})
console.log(aPerson.favoritePet.__schema__)
const allPets = await Promise.all(
  aPerson.pets.map(aPersonsPet => resolve(aPersonsPet)),
)

const fetchedPet = await resolve(aPerson.favoritePet)

console.log(aPerson.favoritePet)
