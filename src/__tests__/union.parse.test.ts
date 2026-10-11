import {describe, expect, test} from 'vitest'

import {date} from '../creators/date'
import {dateTime} from '../creators/dateTime'
import {file} from '../creators/file'
import {image} from '../creators/image'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {parse} from '../parse'

describe('typed object union', () => {
  test('successful parsing', () => {
    const u = union([
      object({
        _type: literal('success'),
        status: literal('success'),
        data: string(),
      }),
      object({
        _type: literal('failure'),
        status: literal('failed'),
        error: string(),
      }),
      image({
        caption: string(),
      }),
      file({
        description: string(),
      }),
    ])

    expect(
      parse(u, {_type: 'success', status: 'success', data: 'it succeeded'}).ok,
    ).toBe(true)
  })
  test('successful parsing of unions of unions', () => {
    const u = union([
      object({
        _type: literal('a'),
      }),
      image({
        caption: string(),
      }),
      file({
        description: string(),
      }),
      union([
        object({
          _type: literal('b'),
        }),
        object({
          _type: literal('c'),
        }),
        union([
          object({
            _type: literal('d'),
          }),
          object({
            _type: literal('e'),
          }),
        ]),
      ]),
    ])

    expect(parse(u, {_type: 'a'})).toEqual({ok: true, value: {_type: 'a'}})
    expect(parse(u, {_type: 'b'})).toEqual({ok: true, value: {_type: 'b'}})
    expect(parse(u, {_type: 'c'})).toEqual({ok: true, value: {_type: 'c'}})
    expect(parse(u, {_type: 'd'})).toEqual({ok: true, value: {_type: 'd'}})
    expect(parse(u, {_type: 'e'})).toEqual({ok: true, value: {_type: 'e'}})

    expect(parse(u, {_type: 'x'})).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_OBJECT_UNION",
              "message": "Type "x" not found among valid union types",
              "path": [],
            },
          ],
          "message": "Invalid input at <root>: Type "x" not found among valid union types",
        },
        "ok": false,
      }
    `)

    expect(
      parse(u, {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
        caption: 'Some caption',
      }),
    ).toEqual({
      ok: true,
      value: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
        caption: 'Some caption',
      },
    })

    expect(
      parse(u, {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
        description: 'Some description',
      }),
    ).toEqual({
      ok: true,
      value: {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
        description: 'Some description',
      },
    })

    expect(
      parse(u, {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
        description: 'Some description',
      }),
    ).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_OBJECT_UNION",
              "message": "Cannot parse input as union type "image"",
              "path": [],
            },
            {
              "code": "INVALID_TYPE",
              "message": "Expected a string",
              "path": [
                "caption",
              ],
            },
          ],
          "message": "Invalid input (2 issues):
        <root>: Cannot parse input as union type "image"
        caption: Expected a string",
        },
        "ok": false,
      }
    `)
  })
  test('failed parsing when invalid literal value for discriminator', () => {
    const u = union([
      object({
        _type: literal('success'),
        status: literal('success'),
        data: string(),
      }),
      object({
        _type: literal('failure'),
        status: literal('failed'),
        error: string(),
      }),
    ])

    expect(parse(u, {status: 'neither'})).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_OBJECT_UNION",
              "message": "Expected an object with a "_type"-property",
              "path": [],
            },
          ],
          "message": "Invalid input at <root>: Expected an object with a "_type"-property",
        },
        "ok": false,
      }
    `)
  })
  test("failed parsing when schema doesn't match discriminated union type", () => {
    const u = union([
      object({
        _type: literal('success'),
        status: literal('success'),
        data: object({num: number()}),
      }),
      object({
        _type: literal('failure'),
        status: literal('failed'),
        error: string(),
      }),
    ])

    expect(parse(u, {status: 'success', data: {num: 'not a number'}}))
      .toMatchInlineSnapshot(`
        {
          "error": ParseError {
            "issues": [
              {
                "code": "INVALID_OBJECT_UNION",
                "message": "Expected an object with a "_type"-property",
                "path": [],
              },
            ],
            "message": "Invalid input at <root>: Expected an object with a "_type"-property",
          },
          "ok": false,
        }
      `)
  })
})

test('primitive unions may contain date and dateTime', () => {
  const schema = union([date(), dateTime(), string()])
  expect(schema.typeName).toBe('primitiveUnion')
  expect(parse(schema, '2023-12-06')).toEqual({ok: true, value: '2023-12-06'})
  expect(parse(schema, '2023-12-06T19:01:07Z')).toEqual({
    ok: true,
    value: '2023-12-06T19:01:07Z',
  })
  expect(parse(schema, 'anything')).toEqual({ok: true, value: 'anything'})
})
