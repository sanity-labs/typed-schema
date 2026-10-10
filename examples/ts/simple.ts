import {
  boolean,
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

// define and export a user schema
export const User = document({
  _type: literal('user'),
  name: string(),
  union: union([string(), number()]),
  optional: optional(boolean()),
  nested: object({
    foo: optional(string()),
  }),
})

// export the User type inferred from the User schema
export type User = Infer<typeof User>

// Use it to validate that a value is compatible with the schema
const user = parse(User, {
  _type: 'user',
  name: 'Grace Hopper',
  union: 'this is a string, but could also be number',
  optional: true,
  nested: {
    foo: 'bar',
  },
})

// 💥 type error
// @ts-expect-error TS2339: Property noSuchProperty does not exist on type
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
user.noSuchProperty

// 💥 type error
// @ts-expect-error TS2365: Operator + cannot be applied to types {foo?: string | undefined;} and number
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
user.nested + 2
