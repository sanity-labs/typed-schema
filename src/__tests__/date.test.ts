import {describe, expect, test} from 'vitest'

import {date} from '../creators/date'
import {safeParse} from '../parse'

describe('date type', () => {
  test('date type definition', () => {
    const dateSchema = date()
    expect(safeParse(dateSchema, '2023-01-22')).toMatchInlineSnapshot(`
      {
        "status": "ok",
        "value": "2023-01-22",
      }
    `)
  })
  test('errors', () => {
    const dateSchema = date()
    expect(safeParse(dateSchema, '2023-12-06')).toMatchInlineSnapshot(`
      {
        "status": "ok",
        "value": "2023-12-06",
      }
    `)
    expect(safeParse(dateSchema, '2023-12-06')).toMatchInlineSnapshot(`
      {
        "status": "ok",
        "value": "2023-12-06",
      }
    `)

    expect(
      safeParse(
        dateSchema,
        '2023-12-06 ', // note the trailing whitespace
      ),
    ).toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "code": "INVALID_TYPE",
            "input": "2023-12-06 ",
            "message": "Expected a date string on the format "YYYY-MM-DD"",
            "path": [],
          },
        ],
        "status": "fail",
      }
    `)
    expect(safeParse(dateSchema, '2023-1-6')).toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "code": "INVALID_TYPE",
            "input": "2023-1-6",
            "message": "Expected a date string on the format "YYYY-MM-DD"",
            "path": [],
          },
        ],
        "status": "fail",
      }
    `)
    expect(safeParse(dateSchema, 'xyz')).toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "code": "INVALID_TYPE",
            "input": "xyz",
            "message": "Expected a date string on the format "YYYY-MM-DD"",
            "path": [],
          },
        ],
        "status": "fail",
      }
    `)
    expect(safeParse(dateSchema, undefined)).toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "code": "INVALID_TYPE",
            "input": undefined,
            "message": "Expected a date string on the format "YYYY-MM-DD"",
            "path": [],
          },
        ],
        "status": "fail",
      }
    `)
    expect(safeParse(dateSchema, {})).toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "code": "INVALID_TYPE",
            "input": {},
            "message": "Expected a date string on the format "YYYY-MM-DD"",
            "path": [],
          },
        ],
        "status": "fail",
      }
    `)
  })
})

describe('date validation', () => {
  const dateSchema = date()
  test('accepts valid calendar dates', () => {
    expect(safeParse(dateSchema, '2024-02-29').status).toBe('ok') // leap day
    expect(safeParse(dateSchema, '2023-01-31').status).toBe('ok')
    expect(safeParse(dateSchema, '2023-12-31').status).toBe('ok')
  })
  test('rejects invalid months and days', () => {
    expect(safeParse(dateSchema, '2023-45-10').status).toBe('fail')
    expect(safeParse(dateSchema, '2023-00-10').status).toBe('fail')
    expect(safeParse(dateSchema, '2023-02-31').status).toBe('fail')
    expect(safeParse(dateSchema, '2023-02-29').status).toBe('fail') // not a leap year
    expect(safeParse(dateSchema, '2023-04-31').status).toBe('fail')
    expect(safeParse(dateSchema, '2023-12-00').status).toBe('fail')
  })
  test('rejects date-times', () => {
    expect(safeParse(dateSchema, '2023-12-06T19:01:07Z').status).toBe('fail')
  })
})
