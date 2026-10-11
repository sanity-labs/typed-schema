import {expect, test} from 'vitest'

import {array} from '../creators/array'
import {number} from '../creators/number'
import {string} from '../creators/string'
import {parse} from '../parse'

test('parses an array of primitives', () => {
  expect(parse(array(string()), ['a', 'b'])).toEqual({
    ok: true,
    value: ['a', 'b'],
  })
  expect(parse(array(number()), [])).toEqual({ok: true, value: []})
})

test('reports failing elements with their index instead of throwing', () => {
  expect(parse(array(string()), ['ok', 1, 'ok', null])).toMatchInlineSnapshot(`
    {
      "error": ParseError {
        "issues": [
          {
            "code": "INVALID_TYPE",
            "input": 1,
            "message": "Expected a string",
            "path": [
              1,
            ],
          },
          {
            "code": "INVALID_TYPE",
            "input": null,
            "message": "Expected a string",
            "path": [
              3,
            ],
          },
        ],
        "message": "Invalid input at "[1]": Expected a string (+ 1)",
      },
      "ok": false,
    }
  `)
})

test('rejects non-arrays', () => {
  expect(parse(array(string()), 'nope').ok).toBe(false)
})
