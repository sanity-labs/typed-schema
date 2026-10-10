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

const Pet = document({_type: literal('pet'), name: string()})

declare const petOutput: Infer<typeof Pet>

const Person = document({
  _type: literal('person'),
  firstName: string(),
  lastName: optional(string()),
  favoritePet: reference(Pet),
  pets: array(reference(Pet)),
})

declare const personOutput: Infer<typeof Person>

type Person = Infer<typeof Person>

const aPerson = parse(Person, {})
const resolve = createReferenceLoader(async () => {})
console.log(aPerson.favoritePet.__schema__)
const allPets = await Promise.all(
  aPerson.pets.map(aPersonsPet => resolve(aPersonsPet)),
)

const fetchedPet = await resolve(aPerson.favoritePet)

console.log(aPerson.favoritePet)
