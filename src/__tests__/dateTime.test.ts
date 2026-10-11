import {describe, expect, test} from 'vitest'

import {dateTime} from '../creators/dateTime'
import {parse} from '../parse'

describe('dateTime type', () => {
  test('parsing dateTime', () => {
    const DateTime = dateTime()
    expect(parse(DateTime, '2023-12-06T19:01:07.512Z')).toMatchInlineSnapshot(`
      {
        "ok": true,
        "value": "2023-12-06T19:01:07.512Z",
      }
    `)
  })

  test('errors', () => {
    const DateTime = dateTime()
    expect(parse(DateTime, '2023-12-06')).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": "2023-12-06",
              "message": "Expected an ISO 8601 dateTime string on the format "YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)"",
              "path": [],
            },
          ],
          "message": "Invalid input at "<root>": Expected an ISO 8601 dateTime string on the format "YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)"",
        },
        "ok": false,
      }
    `)
    expect(parse(DateTime, '2023-12-06T19:01:07  ')).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": "2023-12-06T19:01:07  ",
              "message": "Expected an ISO 8601 dateTime string on the format "YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)"",
              "path": [],
            },
          ],
          "message": "Invalid input at "<root>": Expected an ISO 8601 dateTime string on the format "YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)"",
        },
        "ok": false,
      }
    `)
    expect(parse(DateTime, 'xyz')).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": "xyz",
              "message": "Expected an ISO 8601 dateTime string on the format "YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)"",
              "path": [],
            },
          ],
          "message": "Invalid input at "<root>": Expected an ISO 8601 dateTime string on the format "YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)"",
        },
        "ok": false,
      }
    `)
    expect(parse(DateTime, undefined)).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": undefined,
              "message": "Expected a string",
              "path": [],
            },
          ],
          "message": "Invalid input at "<root>": Expected a string",
        },
        "ok": false,
      }
    `)
    expect(parse(DateTime, {})).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_TYPE",
              "input": {},
              "message": "Expected a string",
              "path": [],
            },
          ],
          "message": "Invalid input at "<root>": Expected a string",
        },
        "ok": false,
      }
    `)
  })
})

describe('ISO 8601 variants', () => {
  const DateTime = dateTime()
  test('accepts values without milliseconds and with offsets', () => {
    for (const value of [
      '2023-12-06T19:01:07Z',
      '2023-12-06T19:01:07.5Z',
      '2023-12-06T19:01:07.512345Z',
      '2023-12-06T19:01Z',
      '2023-12-06T19:01:07+01:00',
      '2023-12-06T19:01:07.000-05:30',
    ]) {
      expect(parse(DateTime, value), value).toEqual({
        ok: true,
        value,
      })
    }
  })
  test('rejects values without a time zone designator or with invalid parts', () => {
    for (const value of [
      '2023-12-06T19:01:07',
      '2023-12-06T19:01:07.512',
      '2023-12-06 19:01:07Z',
      '2023-13-06T19:01:07Z',
      '2023-12-06T25:01:07Z',
      '2023-12-06T19:01:07+1:00',
    ]) {
      expect(parse(DateTime, value).ok, value).toBe(false)
    }
  })
})
