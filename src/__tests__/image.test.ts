import {describe, expect, test} from 'vitest'

import {image} from '../creators/image'
import {string} from '../creators/string'
import {parse} from '../parse'

const PlainImage = image()

const CustomImage = image({
  caption: string(),
})

describe('image type', () => {
  test('image type definition', () => {
    expect(
      parse(PlainImage, {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": {
          "_type": "image",
          "asset": {
            "_ref": "123",
            "_type": "reference",
          },
        },
      }
    `)
    expect(
      parse(CustomImage, {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
        caption: 'A nice pic of my favourite lizard, Leon.',
      }),
    ).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": {
          "_type": "image",
          "asset": {
            "_ref": "123",
            "_type": "reference",
          },
          "caption": "A nice pic of my favourite lizard, Leon.",
        },
      }
    `)
  })
  test('without a shape, unknown fields are stripped', () => {
    expect(
      parse(image(), {
        _type: 'image',
        asset: {_type: 'reference', _ref: '123'},
        caption: 'not declared',
      }),
    ).toEqual({
      ok: true,
      value: {_type: 'image', asset: {_type: 'reference', _ref: '123'}},
    })
  })
  test('without a shape is the same schema as an empty shape', () => {
    expect(JSON.stringify(image())).toEqual(JSON.stringify(image({})))
  })
  test('errors', () => {
    expect(
      parse(PlainImage, {
        _type: 'image',
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
      parse(PlainImage, {
        _type: 'image',
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
      parse(CustomImage, {
        _type: 'image',
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
