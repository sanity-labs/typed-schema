import {describe, expect, test} from 'vitest'

import {file} from '../creators/file'
import {string} from '../creators/string'
import {parse} from '../parse'

const PlainFile = file()

const CustomFile = file({
  caption: string(),
})

describe('file type', () => {
  test('file type definition', () => {
    expect(
      parse(PlainFile, {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": {
          "_type": "file",
          "asset": {
            "_ref": "123",
            "_type": "reference",
          },
        },
      }
    `)
    expect(
      parse(CustomFile, {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
        caption: 'An absolutely tip-top file for you.',
      }),
    ).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": {
          "_type": "file",
          "asset": {
            "_ref": "123",
            "_type": "reference",
          },
          "caption": "An absolutely tip-top file for you.",
        },
      }
    `)
  })
  test('without a shape, unknown fields are stripped', () => {
    expect(
      parse(file(), {
        _type: 'file',
        asset: {_type: 'reference', _ref: '123'},
        caption: 'not declared',
      }),
    ).toEqual({
      ok: true,
      value: {_type: 'file', asset: {_type: 'reference', _ref: '123'}},
    })
  })
  test('without a shape is the same schema as an empty shape', () => {
    expect(JSON.stringify(file())).toEqual(JSON.stringify(file({})))
  })
  test('errors', () => {
    expect(
      parse(PlainFile, {
        _type: 'file',
      }),
    ).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": undefined,
              "message": "Expected an object with keys {_type, _ref, _weak}",
              "path": [
                "asset",
              ],
            },
          ],
          "message": "Invalid input at "asset": Expected an object with keys {_type, _ref, _weak}",
        },
        "ok": false,
      }
    `)
    expect(
      parse(PlainFile, {
        _type: 'file',
        asset: {},
      }),
    ).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": undefined,
              "message": "Expected literal value "reference"",
              "path": [
                "asset",
                "_type",
              ],
            },
            {
              "code": "INVALID_TYPE",
              "input": undefined,
              "message": "Expected a string",
              "path": [
                "asset",
                "_ref",
              ],
            },
          ],
          "message": "Invalid input at "asset._type": Expected literal value "reference" (+ 1)",
        },
        "ok": false,
      }
    `)
    expect(
      parse(CustomFile, {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": undefined,
              "message": "Expected a string",
              "path": [
                "caption",
              ],
            },
          ],
          "message": "Invalid input at "caption": Expected a string",
        },
        "ok": false,
      }
    `)
  })
})
