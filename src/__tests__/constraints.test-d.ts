import {describe, test} from 'vitest'

import {
  type Infer,
  type SanityArray,
  type SanityNumber,
  type SanityObject,
  type SanityObjectArray,
  type SanityObjectUnion,
  type SanityPrimitiveArray,
  type SanityString,
} from '../defs'
import {type ElementType} from '../helpers/utilTypes'

// lil helper to avoid having to alias types everywhere
declare function pass<_T>(): any

describe('Type level constraints', () => {
  test('multidimensional arrays not allowed', () => {
    // @ts-expect-error array of array is not allowed
    pass<SanityPrimitiveArray<SanityPrimitiveArray<string>>>()

    pass<
      SanityObjectArray<
        // @ts-expect-error array of array is not allowed
        SanityObjectArray<SanityObject<{_key: SanityString}>>
      >
    >()
  })
  test('arrays mixing primitive values and objects are not allowed', () => {
    type ObjectOrString = SanityObjectUnion<
      // @ts-expect-error arrays of primitives and objects are not allowed
      SanityObject<{foo: SanityString}> | SanityString
    >

    pass<SanityArray<SanityObject<{foo: SanityString}>>>()
    pass<SanityArray<SanityString | SanityNumber>>()

    // @ts-expect-error arrays of primitives and objects are not allowed
    pass<SanityArray<ObjectOrString>>()
    // @ts-expect-error arrays of primitives and objects are not allowed
    pass<SanityPrimitiveArray<ObjectOrString>>()
    // @ts-expect-error arrays of primitives and objects are not allowed
    pass<SanityObjectArray<ObjectOrString>>()
  })
  test('Element types of object arrays gets assigned a required _key', () => {
    type SomeObjectType = SanityObject<{foo: SanityString}>
    type SomeObjectPlain = Infer<SomeObjectType>

    // @ts-expect-error property _key does not exist on object type
    pass<SomeObjectPlain['_key']>()

    type SomeObjectArray = SanityArray<SomeObjectType>

    type SomeObjectFromArray = ElementType<Infer<SomeObjectArray>>
    // Will get assigned a _key when contained in an array
    pass<SomeObjectFromArray['_key']>()
  })
})
