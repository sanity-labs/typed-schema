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

const Address = object({
  city: string(),
  country: string(),
})

const Human = document({
  _type: literal('human'),
  name: string(),
  address: array(Address),
})

const Pet = document({
  _type: literal('pet'),
  name: string(),
  humans: array(reference(Human)),
})

type Pet = Infer<typeof Pet>
const PartialPet = deepPartial(Pet)

type PartiaPet = Infer<typeof PartialPet>

const p: PartiaPet = {
  _type: 'pet',
  name: 'jara',
  humans: [],
}

const jaraAsJson = client.fetch('*[_type == "pet" && _id=="jara"][0]')

const jaraTheDog = parse(Pet, jaraAsJson)

if (jaraTheDog.ok) {
  const humansOfJara = await Promise.all(
    jaraTheDog.value.humans.map(humanReference =>
      loadReference(humanReference),
    ),
  )

  humansOfJara.forEach(humanOfJara => console.log(humanOfJara))
}
