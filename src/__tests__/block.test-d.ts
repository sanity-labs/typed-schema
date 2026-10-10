import {describe, expectTypeOf, test} from 'vitest'

import {block} from '../creators/block'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {type Infer} from '../defs'

describe('block type', () => {
  test('block type definition', () => {
    const blockSchema = block({
      list: union([literal('bullet'), literal('number')]),
      style: union([literal('normal'), literal('h1'), literal('h2')]),
      inline: object({
        _type: literal('author'),
        name: string(),
      }),
      decorator: union([literal('strong'), literal('em')]),
      annotation: union([
        object({_type: literal('author'), foo: number()}),
        object({_type: literal('book'), bar: number()}),
      ]),
    })

    type ExpectedBlockValue = {
      _type: 'block'
      listItem?: 'number' | 'bullet' | undefined
      style?: 'normal' | 'h1' | 'h2' | undefined
      children: (
        | {_type: 'author'; name: string; _key: string}
        | {
            _type: 'span'
            _key: string
            text: string
            marks: string[]
          }
      )[]
      markDefs?:
        | (
            | {_type: 'author'; foo: number; _key: string}
            | {_type: 'book'; bar: number; _key: string}
          )[]
        | undefined
      level?: number | undefined
    }

    type ActualType = Infer<typeof blockSchema>

    expectTypeOf<ActualType>().toEqualTypeOf<ExpectedBlockValue>()
  })

  test('block type definition without config', () => {
    const blockSchema = block({})

    type ExpectedBlockValue = {
      _type: 'block'
      style?: string | undefined
      listItem?: string | undefined
      children: {
        _type: 'span'
        _key: string
        text: string
        marks: string[]
      }[]
      level?: number
      markDefs?: never[] | undefined
    }

    type ActualType = Infer<typeof blockSchema>

    expectTypeOf<ActualType>().toEqualTypeOf<ExpectedBlockValue>()
  })
})
