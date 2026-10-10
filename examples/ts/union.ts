import {
  array,
  boolean,
  literal,
  number,
  object,
  parse,
  string,
  union,
} from '@sanity-labs/typed-schema'

const InvalidUnion = union([
  string(),
  number(),
  boolean(),
  // @ts-expect-error - cannot mix object types and primitives
  object({_type: literal('some-object'), foo: string()}),
])

const SingleUnion = union([
  object({_type: literal('some-object'), foo: string()}),
])

const Arr = array(SingleUnion)
const u1 = parse(Arr, [{}])

const MultiUnion = union([
  object({_type: literal('some-object'), foo: string()}),
  object({_type: literal('other-object'), num: number()}),
])

const u2 = parse(MultiUnion, {})
