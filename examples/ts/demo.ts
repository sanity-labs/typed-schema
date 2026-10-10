import {
  array,
  deepPartial,
  document,
  type Infer,
  literal,
  object,
  parse,
  reference,
  string,
} from '@sanity-labs/typed-schema'
import {type SanityClient} from '@sanity/client'

import {loadReference} from './loader'

declare const client: SanityClient

const address = object({
  city: string(),
  country: string(),
})

const human = document({
  _type: literal('human'),
  name: string(),
  address: array(address),
})

const pet = document({
  _type: literal('pet'),
  name: string(),
  humans: array(reference(human)),
})

type Pet = Infer<typeof pet>
const partialPet = deepPartial(pet)

type PartiaPet = Infer<typeof partialPet>

const p: PartiaPet = {
  _type: 'pet',
  name: 'jara',
  humans: [],
}

const jaraAsJson = client.fetch('*[_type == "pet" && _id=="jara"][0]')

const jaraTheDog = parse(pet, jaraAsJson)

const humansOfJara = await Promise.all(
  jaraTheDog.humans.map(humanReference => loadReference(humanReference)),
)

humansOfJara.forEach(humanOfJara => console.log(humanOfJara))
