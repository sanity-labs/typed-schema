import {array, literal, object, union} from '@sanity-labs/typed-schema'

import {strictMode} from '../../src/helpers/strictMode'

const Person = strictMode(
  object({
    _type: literal('person'),
    name: object({
      _type: literal('name'),
      first: 'string',
      last: 'string',
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
