import {describe, expect, test} from 'vitest'

import {file} from '../creators/file'
import {string} from '../creators/string'
import {safeParse} from '../parse'

const PlainFile = file({})

const CustomFile = file({
  caption: string(),
})

describe('file type', () => {
  test('file type definition', () => {
    expect(
      safeParse(PlainFile, {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "status": "ok",
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
      safeParse(CustomFile, {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
        caption: 'An absolutely tip-top file for you.',
      }),
    ).toMatchInlineSnapshot(`
      {
        "status": "ok",
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
  test('errors', () => {
    expect(
      safeParse(PlainFile, {
        _type: 'file',
      }),
    ).toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "code": "INVALID_TYPE",
            "input": undefined,
            "message": "Expected an object with keys {_type, _ref, _weak}",
            "path": [
              "asset",
            ],
          },
        ],
        "status": "fail",
      }
    `)
    expect(
      safeParse(PlainFile, {
        _type: 'file',
        asset: {},
      }),
    ).toMatchInlineSnapshot(`
      {
        "errors": [
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
        "status": "fail",
      }
    `)
    expect(
      safeParse(CustomFile, {
        _type: 'file',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "code": "INVALID_TYPE",
            "input": undefined,
            "message": "Expected a string",
            "path": [
              "caption",
            ],
          },
        ],
        "status": "fail",
      }
    `)
  })
})
