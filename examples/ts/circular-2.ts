import {
  extend,
  lazy,
  literal,
  number,
  object,
  type ObjectSchemaOf,
  type OutputOf,
  string,
} from '@sanity-labs/typed-schema'

interface Person {
  _type: 'person'
  name: number
  parent: Person & {foo: string}
}

const Person: ObjectSchemaOf<Person> = object({
  _type: literal('person'),
  name: lazy(() => number()),
  foo: literal('ok'),
  parent: lazy(() => extend(Person, {foo: string()})),
})

declare const person: OutputOf<typeof Person>
