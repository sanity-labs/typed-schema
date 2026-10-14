import {expect, test} from 'vitest'

import {
  float32,
  float64,
  int32,
  number,
  safeint,
  uint32,
} from '../creators/number'
import {parse} from '../parse'

test('parse a number', () => {
  const schema = number()
  expect(parse(schema, 1)).toEqual({ok: true, value: 1})
  expect(parse(schema, 1.1)).toEqual({ok: true, value: 1.1})
})

test('min/max constraints', () => {
  const Min1max20 = number({min: 1, max: 20})
  expect(parse(Min1max20, 1)).toEqual({ok: true, value: 1})
  expect(parse(Min1max20, 20)).toEqual({ok: true, value: 20})
  expect(parse(Min1max20, 0.9)).toMatchInlineSnapshot(`
    {
      "error": ParseError {
        "issues": [
          {
            "code": "NUM_TOO_SMALL",
            "message": "Expected a number greater than, or equal to 1",
            "path": [],
          },
        ],
        "message": "Invalid input at <root>: Expected a number greater than, or equal to 1",
      },
      "ok": false,
    }
  `)
  expect(parse(Min1max20, 20.1)).toMatchInlineSnapshot(`
    {
      "error": ParseError {
        "issues": [
          {
            "code": "NUM_TOO_BIG",
            "message": "Expected a number less than, or equal to 20",
            "path": [],
          },
        ],
        "message": "Invalid input at <root>: Expected a number less than, or equal to 20",
      },
      "ok": false,
    }
  `)
})

test('lt/gt constraints', () => {
  const Gt1lt20 = number({gt: 1, lt: 20})
  expect(parse(Gt1lt20, 1.1)).toEqual({ok: true, value: 1.1})
  expect(parse(Gt1lt20, 19.9)).toEqual({ok: true, value: 19.9})
  expect(parse(Gt1lt20, 1)).toMatchInlineSnapshot(`
    {
      "error": ParseError {
        "issues": [
          {
            "code": "NUM_TOO_SMALL",
            "message": "Expected a number greater than 1",
            "path": [],
          },
        ],
        "message": "Invalid input at <root>: Expected a number greater than 1",
      },
      "ok": false,
    }
  `)
  expect(parse(Gt1lt20, 20)).toMatchInlineSnapshot(`
    {
      "error": ParseError {
        "issues": [
          {
            "code": "NUM_TOO_BIG",
            "message": "Expected a number less than 20",
            "path": [],
          },
        ],
        "message": "Invalid input at <root>: Expected a number less than 20",
      },
      "ok": false,
    }
  `)
})

test('step constraints', () => {
  const MultipleOfTwo = number({step: 2})
  expect(parse(MultipleOfTwo, 2)).toEqual({ok: true, value: 2})
  expect(parse(MultipleOfTwo, 4)).toEqual({ok: true, value: 4})
  expect(parse(MultipleOfTwo, 1)).toMatchInlineSnapshot(`
    {
      "error": ParseError {
        "issues": [
          {
            "code": "NUM_NOT_MULTIPLE_OF",
            "message": "Expected a number that is a multiple of 2",
            "path": [],
          },
        ],
        "message": "Invalid input at <root>: Expected a number that is a multiple of 2",
      },
      "ok": false,
    }
  `)
  expect(parse(MultipleOfTwo, 9)).toMatchInlineSnapshot(`
    {
      "error": ParseError {
        "issues": [
          {
            "code": "NUM_NOT_MULTIPLE_OF",
            "message": "Expected a number that is a multiple of 2",
            "path": [],
          },
        ],
        "message": "Invalid input at <root>: Expected a number that is a multiple of 2",
      },
      "ok": false,
    }
  `)
})

test('zero is a valid constraint boundary', () => {
  expect(parse(number({min: 0}), 0)).toEqual({ok: true, value: 0})
  expect(parse(number({min: 0}), -5).ok).toBe(false)
  expect(parse(number({max: 0}), 5).ok).toBe(false)
  expect(parse(number({max: 0}), -1)).toEqual({ok: true, value: -1})
  expect(parse(number({gt: 0}), 0).ok).toBe(false)
  expect(parse(number({lt: 0}), 0).ok).toBe(false)
})

test('rejects NaN and infinities', () => {
  expect(parse(number(), NaN)).toMatchInlineSnapshot(`
    {
      "error": ParseError {
        "issues": [
          {
            "code": "INVALID_TYPE",
            "message": "Expected a finite number",
            "path": [],
          },
        ],
        "message": "Invalid input at <root>: Expected a finite number",
      },
      "ok": false,
    }
  `)
  expect(parse(number({min: 0}), Infinity).ok).toBe(false)
  expect(parse(number(), -Infinity).ok).toBe(false)
})

test('integer helpers reject non-integers and out-of-range values', () => {
  expect(parse(uint32(), 0)).toEqual({ok: true, value: 0})
  expect(parse(uint32(), 4294967295)).toEqual({ok: true, value: 4294967295})
  expect(parse(uint32(), -1).ok).toBe(false)
  expect(parse(uint32(), 1.5).ok).toBe(false)
  expect(parse(int32(), 1.5).ok).toBe(false)
  expect(parse(int32(), 2147483648).ok).toBe(false)
  expect(parse(int32(), -2147483648)).toEqual({ok: true, value: -2147483648})
  expect(parse(safeint(), 0.1).ok).toBe(false)
  expect(parse(safeint(), Number.MAX_SAFE_INTEGER)).toEqual({
    ok: true,
    value: Number.MAX_SAFE_INTEGER,
  })
})

test('float helpers accept fractions within their range', () => {
  expect(parse(float32(), 1.5)).toEqual({ok: true, value: 1.5})
  expect(parse(float32(), 3.4028234663852886e38).ok).toBe(true)
  expect(parse(float32(), 3.5e38).ok).toBe(false)
  expect(parse(float32(), -3.5e38).ok).toBe(false)
  expect(parse(float64(), Number.MAX_VALUE).ok).toBe(true)
  expect(parse(float64(), -Number.MAX_VALUE).ok).toBe(true)
  expect(parse(float64({title: 'Ratio'}), 0.25)).toEqual({
    ok: true,
    value: 0.25,
  })
})
