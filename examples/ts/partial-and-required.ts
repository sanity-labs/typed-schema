import {
  boolean,
  deepPartial,
  document,
  type Infer,
  literal,
  number,
  object,
  optional,
  parse,
  string,
  union,
} from '@sanity-labs/typed-schema'

import {deepRequired} from '../../src/utils/deepRequired'
import {shallowRequired} from '../../src/utils/shallowRequired'

const doc = document({
  _type: literal('pet'),
  name: string(),
  union: union([string(), number()]),
  opt: optional(boolean()),
  nested: object({
    foo: optional(string()),
  }),
})

type Doc = Infer<typeof doc>

const parsed = parse(doc, {})

const parsedPartial = parse(deepPartial(doc), {})

const parsedDeepRequired = parse(deepRequired(doc), {})

const parsedShallowRequired = parse(shallowRequired(doc), {})
