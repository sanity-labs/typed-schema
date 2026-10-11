import {describe, expect, test} from 'vitest'

import {date} from '../creators/date'
import {parse} from '../parse'

describe('date type', () => {
  test('date type definition', () => {
    const DateSchema = date()
    expect(parse(DateSchema, '2023-01-22')).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": "2023-01-22",
      }
    `)
  })
  test('errors', () => {
    const DateSchema = date()
    expect(parse(DateSchema, '2023-12-06')).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": "2023-12-06",
      }
    `)
    expect(parse(DateSchema, '2023-12-06')).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": "2023-12-06",
      }
    `)

    expect(
      parse(
        DateSchema,
        '2023-12-06 ', // note the trailing whitespace
      ),
    ).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": "2023-12-06 ",
              "message": "Expected a date string on the format "YYYY-MM-DD"",
              "path": [],
            },
          ],
          "message": "Invalid input at "<root>": Expected a date string on the format "YYYY-MM-DD"",
        },
        "ok": false,
      }
    `)
    expect(parse(DateSchema, '2023-1-6')).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": "2023-1-6",
              "message": "Expected a date string on the format "YYYY-MM-DD"",
              "path": [],
            },
          ],
          "message": "Invalid input at "<root>": Expected a date string on the format "YYYY-MM-DD"",
        },
        "ok": false,
      }
    `)
    expect(parse(DateSchema, 'xyz')).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": "xyz",
              "message": "Expected a date string on the format "YYYY-MM-DD"",
              "path": [],
            },
          ],
          "message": "Invalid input at "<root>": Expected a date string on the format "YYYY-MM-DD"",
        },
        "ok": false,
      }
    `)
    expect(parse(DateSchema, undefined)).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": undefined,
              "message": "Expected a date string on the format "YYYY-MM-DD"",
              "path": [],
            },
          ],
          "message": "Invalid input at "<root>": Expected a date string on the format "YYYY-MM-DD"",
        },
        "ok": false,
      }
    `)
    expect(parse(DateSchema, {})).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": {},
              "message": "Expected a date string on the format "YYYY-MM-DD"",
              "path": [],
            },
          ],
          "message": "Invalid input at "<root>": Expected a date string on the format "YYYY-MM-DD"",
        },
        "ok": false,
      }
    `)
  })
})

describe('date validation', () => {
  const DateSchema = date()
  test('accepts valid calendar dates', () => {
    expect(parse(DateSchema, '2024-02-29').ok).toBe(true) // leap day
    expect(parse(DateSchema, '2023-01-31').ok).toBe(true)
    expect(parse(DateSchema, '2023-12-31').ok).toBe(true)
  })
  test('rejects invalid months and days', () => {
    expect(parse(DateSchema, '2023-45-10').ok).toBe(false)
    expect(parse(DateSchema, '2023-00-10').ok).toBe(false)
    expect(parse(DateSchema, '2023-02-31').ok).toBe(false)
    expect(parse(DateSchema, '2023-02-29').ok).toBe(false) // not a leap year
    expect(parse(DateSchema, '2023-04-31').ok).toBe(false)
    expect(parse(DateSchema, '2023-12-00').ok).toBe(false)
  })
  test('rejects date-times', () => {
    expect(parse(DateSchema, '2023-12-06T19:01:07Z').ok).toBe(false)
  })
})
