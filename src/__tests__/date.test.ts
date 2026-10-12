import {describe, expect, test} from 'vitest'

import {date} from '../creators/date'
import {parse} from '../parse'

describe('date type', () => {
  test('date type definition', () => {
    const schema = date()
    expect(parse(schema, '2023-01-22')).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": "2023-01-22",
      }
    `)
  })
  test('errors', () => {
    const schema = date()
    expect(parse(schema, '2023-12-06')).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": "2023-12-06",
      }
    `)
    expect(parse(schema, '2023-12-06')).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": "2023-12-06",
      }
    `)

    expect(
      parse(
        schema,
        '2023-12-06 ', // note the trailing whitespace
      ),
    ).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "message": "Expected a date string on the format "YYYY-MM-DD"",
              "path": [],
            },
          ],
          "message": "Invalid input at <root>: Expected a date string on the format "YYYY-MM-DD"",
        },
        "ok": false,
      }
    `)
    expect(parse(schema, '2023-1-6')).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "message": "Expected a date string on the format "YYYY-MM-DD"",
              "path": [],
            },
          ],
          "message": "Invalid input at <root>: Expected a date string on the format "YYYY-MM-DD"",
        },
        "ok": false,
      }
    `)
    expect(parse(schema, 'xyz')).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "message": "Expected a date string on the format "YYYY-MM-DD"",
              "path": [],
            },
          ],
          "message": "Invalid input at <root>: Expected a date string on the format "YYYY-MM-DD"",
        },
        "ok": false,
      }
    `)
    expect(parse(schema, undefined)).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "message": "Expected a date string on the format "YYYY-MM-DD"",
              "path": [],
            },
          ],
          "message": "Invalid input at <root>: Expected a date string on the format "YYYY-MM-DD"",
        },
        "ok": false,
      }
    `)
    expect(parse(schema, {})).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "message": "Expected a date string on the format "YYYY-MM-DD"",
              "path": [],
            },
          ],
          "message": "Invalid input at <root>: Expected a date string on the format "YYYY-MM-DD"",
        },
        "ok": false,
      }
    `)
  })
})

describe('date validation', () => {
  const schema = date()
  test('accepts valid calendar dates', () => {
    expect(parse(schema, '2024-02-29').ok).toBe(true) // leap day
    expect(parse(schema, '2023-01-31').ok).toBe(true)
    expect(parse(schema, '2023-12-31').ok).toBe(true)
  })
  test('rejects invalid months and days', () => {
    expect(parse(schema, '2023-45-10').ok).toBe(false)
    expect(parse(schema, '2023-00-10').ok).toBe(false)
    expect(parse(schema, '2023-02-31').ok).toBe(false)
    expect(parse(schema, '2023-02-29').ok).toBe(false) // not a leap year
    expect(parse(schema, '2023-04-31').ok).toBe(false)
    expect(parse(schema, '2023-12-00').ok).toBe(false)
  })
  test('rejects date-times', () => {
    expect(parse(schema, '2023-12-06T19:01:07Z').ok).toBe(false)
  })
})
