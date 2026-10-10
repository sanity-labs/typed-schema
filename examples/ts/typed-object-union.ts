import {literal, object, parse, string, union} from '@sanity-labs/typed-schema'

const myUnion = union([
  object({
    _type: literal('success'),
    status: literal('success'),
    successProp: string(),
  }),
  object({
    _type: literal('failure'),
    status: literal('failed'),
    failureProp: string(),
  }),
])

const f = parse(myUnion, {status: 'success', successProp: 'it worked'})
