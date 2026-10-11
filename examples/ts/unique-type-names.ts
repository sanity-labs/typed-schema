import {
  array,
  literal,
  object,
  string,
  union,
  verifyUniqueTypeNames,
} from '@sanity-labs/typed-schema'

const Person = verifyUniqueTypeNames(
  object({
    _type: literal('person'),
    name: object({
      _type: literal('name'),
      first: string(),
      last: string(),
    }),
    arr: array(
      union([
        object({
          _type: literal('a'),
        }),
        object({
          _type: literal('b'),
        }),
      ]),
    ),
  }),
)
