import {expect, test} from 'vitest'

import {array} from '../creators/array'
import {number} from '../creators/number'
import {string} from '../creators/string'
import {parse, safeParse} from '../parse'

test('parses an array of primitives', () => {
  expect(parse(array(string()), ['a', 'b'])).toEqual(['a', 'b'])
  expect(parse(array(number()), [])).toEqual([])
})

test('reports failing elements with their index instead of throwing', () => {
  expect(safeParse(array(string()), ['ok', 1, 'ok', null]))
    .toMatchInlineSnapshot(`
      {
        "errors": [
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
        "status": "fail",
      }
    `)
})

test('rejects non-arrays', () => {
  expect(safeParse(array(string()), 'nope').status).toBe('fail')
})
