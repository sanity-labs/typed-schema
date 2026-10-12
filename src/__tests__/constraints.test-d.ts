import {describe, test} from 'vitest'

import {
  type ArraySchema,
  type Infer,
  type NumberSchema,
  type ObjectArraySchema,
  type ObjectSchema,
  type ObjectUnionSchema,
  type PrimitiveArraySchema,
  type StringSchema,
} from '../defs'
import {type ElementType} from '../helpers/utilTypes'

// lil helper to avoid having to alias types everywhere
declare function pass<_T>(): any

describe('Type level constraints', () => {
  test('multidimensional arrays not allowed', () => {
    // @ts-expect-error array of array is not allowed
    pass<PrimitiveArraySchema<PrimitiveArraySchema<string>>>()

    pass<
      ObjectArraySchema<
        // @ts-expect-error array of array is not allowed
        ObjectArraySchema<ObjectSchema<{_key: StringSchema}>>
      >
    >()
  })
  test('arrays mixing primitive values and objects are not allowed', () => {
    type ObjectOrString = ObjectUnionSchema<
      // @ts-expect-error arrays of primitives and objects are not allowed
      ObjectSchema<{foo: StringSchema}> | StringSchema
    >

    pass<ArraySchema<ObjectSchema<{foo: StringSchema}>>>()
    pass<ArraySchema<StringSchema | NumberSchema>>()

    // @ts-expect-error arrays of primitives and objects are not allowed
    pass<ArraySchema<ObjectOrString>>()
    // @ts-expect-error arrays of primitives and objects are not allowed
    pass<PrimitiveArraySchema<ObjectOrString>>()
    // @ts-expect-error arrays of primitives and objects are not allowed
    pass<ObjectArraySchema<ObjectOrString>>()
  })
  test('Element types of object arrays gets assigned a required _key', () => {
    type SomeObjectType = ObjectSchema<{foo: StringSchema}>
    type SomeObjectPlain = Infer<SomeObjectType>

    // @ts-expect-error property _key does not exist on object type
    pass<SomeObjectPlain['_key']>()

    type SomeObjectArray = ArraySchema<SomeObjectType>

    type SomeObjectFromArray = ElementType<Infer<SomeObjectArray>>
    // Will get assigned a _key when contained in an array
    pass<SomeObjectFromArray['_key']>()
  })
})
