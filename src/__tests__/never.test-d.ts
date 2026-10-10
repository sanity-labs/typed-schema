import {describe, expectTypeOf, test} from 'vitest'

import {array} from '../creators/array'
import {literal} from '../creators/literal'
import {never} from '../creators/never'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {type Infer} from '../defs'

describe('never type', () => {
  test('never type inference', () => {
    const NeverType = never()
    type NeverOutput = Infer<typeof NeverType>
    expectTypeOf<NeverOutput>({} as never)
  })

  test('never type inference as member of other types', () => {
    const SomeObject = object({
      cantTouchThis: never(),
      primitiveUnion: union([string(), literal('foo'), never()]),
      objectUnion: union([
        object({_type: literal('foo'), foo: string()}),
        never(),
      ]),
      neverArray: array(never()),
      name: string(),
    })

    type SomeObjectType = Infer<typeof SomeObject>

    expectTypeOf<SomeObjectType>(
      {} as {
        cantTouchThis: never
        primitiveUnion: 'foo'
        objectUnion: {_type: 'foo'; foo: string}
        neverArray: never[]
        name: string
      },
    )
  })
})
