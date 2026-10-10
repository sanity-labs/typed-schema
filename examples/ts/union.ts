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

const invalidUnion = union([
  string(),
  number(),
  boolean(),
  // @ts-expect-error - cannot mix object types and primitives
  object({_type: literal('some-object'), foo: string()}),
])

const singleUnion = union([
  object({_type: literal('some-object'), foo: string()}),
])

const arr = array(singleUnion)
const u1 = parse(arr, [{}])

const multiUnion = union([
  object({_type: literal('some-object'), foo: string()}),
  object({_type: literal('other-object'), num: number()}),
])

const u2 = parse(multiUnion, {})
