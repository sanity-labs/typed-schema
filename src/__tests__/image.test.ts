import {describe, expect, test} from 'vitest'

import {image} from '../creators/image'
import {string} from '../creators/string'
import {safeParse} from '../parse'

const PlainImage = image({})

const CustomImage = image({
  caption: string(),
})

describe('image type', () => {
  test('image type definition', () => {
    expect(
      safeParse(PlainImage, {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "status": "ok",
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
      safeParse(CustomImage, {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: '123',
        },
        caption: 'A nice pic of my favourite lizard, Leon.',
      }),
    ).toMatchInlineSnapshot(`
      {
        "status": "ok",
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
  test('errors', () => {
    expect(
      safeParse(PlainImage, {
        _type: 'image',
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
      safeParse(PlainImage, {
        _type: 'image',
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
      safeParse(CustomImage, {
        _type: 'image',
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
