import {describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {
  type ObjectLikeKind,
  type ObjectUnionKind,
  type PrimitiveSchema,
  type PrimitiveUnionSchema,
} from '../defs'
import {parse} from '../parse'

function table<
  CellType extends
    | ObjectLikeKind
    | ObjectUnionKind
    | PrimitiveSchema
    | PrimitiveUnionSchema,
>(cell: CellType) {
  return object({
    _type: literal('table'),
    rows: array(object({cells: array(cell)})),
  })
}

describe('array() with a generic element type', () => {
  test('primitive cell', () => {
    const StringTable = table(string())
    expect(StringTable.shape.rows.element.shape.cells.typeName).toBe(
      'primitiveArray',
    )
    const value = {_type: 'table', rows: [{_key: 'r1', cells: ['a', 'b']}]}
    expect(parse(StringTable, value)).toEqual({ok: true, value})
    expect(
      parse(StringTable, {
        _type: 'table',
        rows: [{_key: 'r1', cells: ['a', 1]}],
      }).ok,
    ).toBe(false)
  })

  test('object union cell', () => {
    const MixedTable = table(
      union([
        object({_type: literal('text'), text: string()}),
        object({_type: literal('amount'), amount: number()}),
      ]),
    )
    expect(MixedTable.shape.rows.element.shape.cells.typeName).toBe(
      'objectArray',
    )
    const value = {
      _type: 'table',
      rows: [
        {
          _key: 'r1',
          cells: [
            {_type: 'text', _key: 'c1', text: 'Total'},
            {_type: 'amount', _key: 'c2', amount: 42},
          ],
        },
      ],
    }
    expect(parse(MixedTable, value)).toEqual({ok: true, value})
    expect(
      parse(MixedTable, {
        _type: 'table',
        rows: [{_key: 'r1', cells: [{_type: 'text', text: 'no key'}]}],
      }).ok,
    ).toBe(false)
  })

  test('recursive schema declared with a getter', () => {
    const Node = object({
      _type: literal('node'),
      name: string(),
      get children() {
        return optional(table(Node))
      },
    })
    const value = {
      _type: 'node',
      name: 'root',
      children: {
        _type: 'table',
        rows: [
          {_key: 'r1', cells: [{_type: 'node', _key: 'c1', name: 'leaf'}]},
        ],
      },
    }
    expect(parse(Node, value)).toEqual({ok: true, value})
    expect(
      parse(Node, {
        ...value,
        children: {
          _type: 'table',
          rows: [{_key: 'r1', cells: [{_type: 'node', _key: 'c1', name: 1}]}],
        },
      }).ok,
    ).toBe(false)
  })
})
