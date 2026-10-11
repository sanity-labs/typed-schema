import {expect, test} from 'vitest'

import {enums} from '../creators/enums'
import {parse} from '../parse'

test('define string array enum', () => {
  const Enum = enums(['a', 'b', 'c'])
  expect(Enum.enum.a).toEqual('a')
  expect(Enum.enum.b).toEqual('b')
  expect(Enum.enum.c).toEqual('c')
})

test('define object literal enum', () => {
  const Enum = enums({foo: 'a', bar: 'b', baz: 'c'})
  expect(Enum.enum.foo).toEqual('a')
  expect(Enum.enum.bar).toEqual('b')
  expect(Enum.enum.baz).toEqual('c')
})

test('define object literal enum as const', () => {
  const enumDef = {foo: 'a', bar: 1, baz: 'c'} as const

  const Enum = enums(enumDef)
  expect(Enum.enum.foo).toEqual('a')
  expect(Enum.enum.bar).toEqual(1)
  expect(Enum.enum.baz).toEqual('c')
})

test('parse string array enum', () => {
  expect(parse(enums(['a', 'b', 'c']), 'a')).toEqual({ok: true, value: 'a'})
  expect(parse(enums(['a', 'b', 'c']), 'x')).toMatchInlineSnapshot(`
    {
      "error": ParseError {
        "issues": [
          {
            "code": "INVALID_ENUM_VALUE",
            "message": "Input doesn't match any of the valid enum values",
            "path": [],
          },
        ],
        "message": "Invalid input at <root>: Input doesn't match any of the valid enum values",
      },
      "ok": false,
    }
  `)
})

test('parse object literal enum', () => {
  expect(parse(enums({foo: 'a', bar: 'b', baz: 'c'}), 'a')).toEqual({
    ok: true,
    value: 'a',
  })
  expect(parse(enums(['a', 'b', 'c']), 'x')).toMatchInlineSnapshot(`
    {
      "error": ParseError {
        "issues": [
          {
            "code": "INVALID_ENUM_VALUE",
            "message": "Input doesn't match any of the valid enum values",
            "path": [],
          },
        ],
        "message": "Invalid input at <root>: Input doesn't match any of the valid enum values",
      },
      "ok": false,
    }
  `)
})
