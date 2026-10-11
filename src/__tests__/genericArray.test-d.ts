import {describe, expectTypeOf, test} from 'vitest'

import {array} from '../creators/array'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {
  type Infer,
  type SanityLiteral,
  type SanityNumber,
  type SanityObjectArray,
  type SanityObjectLikeKind,
  type SanityObjectUnionKind,
  type SanityPrimitive,
  type SanityPrimitiveArray,
  type SanityPrimitiveUnion,
  type SanityString,
} from '../defs'

function table<
  CellType extends
    | SanityObjectLikeKind
    | SanityObjectUnionKind
    | SanityPrimitive
    | SanityPrimitiveUnion,
  TypeName extends SanityLiteral<string> = SanityLiteral<'table'>,
>(options: {_type?: TypeName; cell: CellType}) {
  return object({
    _type: (options._type ?? literal('table')) as TypeName,
    rows: array(object({cells: array(options.cell)})),
  })
}

describe('array() with a generic element type', () => {
  test('string cell', () => {
    const StringTable = table({cell: string()})
    type StringTable = Infer<typeof StringTable>
    expectTypeOf<StringTable>().toEqualTypeOf<{
      _type: 'table'
      rows: {cells: string[]; _key: string}[]
    }>()
  })

  test('number cell', () => {
    const NumberTable = table({_type: literal('numbers'), cell: number()})
    type NumberTable = Infer<typeof NumberTable>
    expectTypeOf<NumberTable>().toEqualTypeOf<{
      _type: 'numbers'
      rows: {cells: number[]; _key: string}[]
    }>()
  })

  test('object union cell', () => {
    const MixedTable = table({
      cell: union([
        object({_type: literal('text'), text: string()}),
        object({_type: literal('amount'), amount: number()}),
      ]),
    })
    type MixedTable = Infer<typeof MixedTable>
    expectTypeOf<MixedTable>().toEqualTypeOf<{
      _type: 'table'
      rows: {
        cells: (
          | {_type: 'text'; text: string; _key: string}
          | {_type: 'amount'; amount: number; _key: string}
        )[]
        _key: string
      }[]
    }>()
  })

  test('recursive schema declared with a getter', () => {
    const Node = object({
      _type: literal('node'),
      name: string(),
      get children() {
        return optional(table({cell: Node}))
      },
    })
    type Node = Infer<typeof Node>
    type Cell = NonNullable<Node['children']>['rows'][number]['cells'][number]
    expectTypeOf<Cell['name']>().toEqualTypeOf<string>()
    expectTypeOf<Cell['_key']>().toEqualTypeOf<string>()
  })

  test('array cell is a type error', () => {
    // @ts-expect-error arrays of arrays are not allowed
    table({cell: array(string())})
  })

  test('concrete calls still resolve to the specific overloads', () => {
    const Price = object({_type: literal('price'), amount: number()})
    expectTypeOf(array(Price)).toEqualTypeOf<SanityObjectArray<typeof Price>>()
    expectTypeOf(array(string())).toEqualTypeOf<
      SanityPrimitiveArray<SanityString>
    >()
    expectTypeOf(array(number())).toEqualTypeOf<
      SanityPrimitiveArray<SanityNumber>
    >()
  })
})
