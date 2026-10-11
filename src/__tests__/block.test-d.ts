import {describe, expectTypeOf, test} from 'vitest'

import {block} from '../creators/block'
import {document} from '../creators/document'
import {image} from '../creators/image'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {
  type Infer,
  type SanityLiteral,
  type SanityObject,
  type SanityString,
} from '../defs'
import {type BlockOptionErrors} from '../helpers/schemaErrors'
import {type SchemaError} from '../helpers/utilTypes'

describe('block type', () => {
  test('block type definition', () => {
    const Block = block({
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

    type ActualType = Infer<typeof Block>

    expectTypeOf<ActualType>().toEqualTypeOf<ExpectedBlockValue>()
  })

  test('block type definition without config', () => {
    const Block = block({})

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

    type ActualType = Infer<typeof Block>

    expectTypeOf<ActualType>().toEqualTypeOf<ExpectedBlockValue>()
  })

  test('images and references inline and as annotations', () => {
    const Author = document({_type: literal('author'), name: string()})
    const Block = block({
      inline: union([image({alt: string()}), reference(Author)]),
      annotation: reference(Author),
    })
    type Block = Infer<typeof Block>
    type Child = Block['children'][number]
    type MarkDef = NonNullable<Block['markDefs']>[number]

    expectTypeOf<Child['_type']>().toEqualTypeOf<
      'span' | 'image' | 'reference'
    >()
    expectTypeOf<
      Extract<Child, {_type: 'image'}>['alt']
    >().toEqualTypeOf<string>()
    expectTypeOf<MarkDef['_type']>().toEqualTypeOf<'reference'>()
    expectTypeOf<MarkDef['_key']>().toEqualTypeOf<string>()
  })
})

describe('invalid block options', () => {
  test('are rejected', () => {
    // @ts-expect-error - style must be a string literal or a union of them
    block({style: string()})
    // @ts-expect-error - list must be a string literal or a union of them
    block({list: union([literal(1), literal(2)])})
    // @ts-expect-error - decorator must be a schema
    block({decorator: 'strong'})
    // @ts-expect-error - inline objects need a _type literal
    block({inline: object({foo: string()})})
    // @ts-expect-error - _type must be a string literal
    block({_type: string()})
    // @ts-expect-error - styles is not a block option
    block({style: literal('normal'), styles: literal('h1')})
  })

  test('report why', () => {
    expectTypeOf<
      BlockOptionErrors<{style: SanityString; list: SanityLiteral<'bullet'>}>
    >().toEqualTypeOf<{
      style: SchemaError<"block() option 'style' must be a string literal() or a union() of string literals">
    }>()
    expectTypeOf<
      BlockOptionErrors<{inline: SanityObject<{foo: SanityString}>}>
    >().toEqualTypeOf<{
      inline: SchemaError<"block() option 'inline' must be a typed object, reference, image, file or a union() of these">
    }>()
    expectTypeOf<
      BlockOptionErrors<{styles: SanityLiteral<'h1'>}>
    >().toEqualTypeOf<{
      styles: SchemaError<"'styles' is not a block() option">
    }>()
    // No option is wrong, so the whole options object is the error
    expectTypeOf<
      BlockOptionErrors<{style: SanityLiteral<'normal'>}>
    >().toEqualTypeOf<SchemaError<'Invalid block() options or annotations'>>()
  })
})
