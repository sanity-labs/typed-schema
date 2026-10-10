import {
  array,
  createReferenceLoader,
  document,
  literal,
  number,
  object,
  type OutputOf,
  parse,
  reference,
  string,
  union,
} from '@sanity-labs/typed-schema'

function assertAssignable<A extends B, B>() {}

const Country = document({
  _type: literal('country'),
  name: string(),
})

const Pet = object({
  _type: literal('pet'),
  species: union([literal('dog'), literal('cat')]),
  name: string(),
})
declare const petOutput: OutputOf<typeof Pet>

const List = array(object({test: string()}))

declare const listOutput: OutputOf<typeof List>

const Person = document({
  _type: literal('person'),
  firstName: string(),
  lastName: string(),
  address: object({
    _type: literal('address'),
    street: string(),
    zip: string(),
    country: reference(Country),
  }),
  visitedCountries: array(reference(Country)),
  pets: array(Pet),
})

declare const personOutput: OutputOf<typeof Person>

const PolyObjectArr = array(
  union([
    object({_type: literal('foo'), foo: string()}),
    object({_type: literal('two'), age: number()}),
  ]),
)
declare const stringOrNumOut: OutputOf<typeof PolyObjectArr>

const t = reference(Country)

const somePerson = parse(Person, {})

console.log(somePerson.address.country)

const resolve = createReferenceLoader(() => Promise.resolve())
const somePersonCountry = await resolve(somePerson.address.country)

const keys = somePerson.pets.map(somePersonsPet => somePersonsPet._key)

assertAssignable<string[], typeof keys>()
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
somePerson.visitedCountries[0]!
const references = somePerson.visitedCountries.map(visitedCountry => [
  visitedCountry._ref,
  visitedCountry._key,
])
assertAssignable<[string, string][], typeof references>()
