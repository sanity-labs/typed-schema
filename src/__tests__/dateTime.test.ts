import {describe, expect, test} from 'vitest'

import {dateTime} from '../creators/dateTime'
import {safeParse} from '../parse'

describe('dateTime type', () => {
  test('parsing dateTime', () => {
    const dateTimeSchema = dateTime()
    expect(safeParse(dateTimeSchema, '2023-12-06T19:01:07.512Z'))
      .toMatchInlineSnapshot(`
      {
        "status": "ok",
        "value": "2023-12-06T19:01:07.512Z",
      }
    `)
  })

  test('errors', () => {
    const dateTimeSchema = dateTime()
    expect(safeParse(dateTimeSchema, '2023-12-06')).toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "code": "INVALID_TYPE",
            "input": "2023-12-06",
            "message": "Expected an ISO 8601 dateTime string on the format "YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)"",
            "path": [],
          },
        ],
        "status": "fail",
      }
    `)
    expect(safeParse(dateTimeSchema, '2023-12-06T19:01:07  '))
      .toMatchInlineSnapshot(`
        {
          "errors": [
            {
              "code": "INVALID_TYPE",
              "input": "2023-12-06T19:01:07  ",
              "message": "Expected an ISO 8601 dateTime string on the format "YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)"",
              "path": [],
            },
          ],
          "status": "fail",
        }
      `)
    expect(safeParse(dateTimeSchema, 'xyz')).toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "code": "INVALID_TYPE",
            "input": "xyz",
            "message": "Expected an ISO 8601 dateTime string on the format "YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)"",
            "path": [],
          },
        ],
        "status": "fail",
      }
    `)
    expect(safeParse(dateTimeSchema, undefined)).toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "code": "INVALID_TYPE",
            "input": undefined,
            "message": "Expected a string",
            "path": [],
          },
        ],
        "status": "fail",
      }
    `)
    expect(safeParse(dateTimeSchema, {})).toMatchInlineSnapshot(`
      {
        "errors": [
          {
            "code": "INVALID_TYPE",
            "input": {},
            "message": "Expected a string",
            "path": [],
          },
        ],
        "status": "fail",
      }
    `)
  })
})

describe('ISO 8601 variants', () => {
  const dateTimeSchema = dateTime()
  test('accepts values without milliseconds and with offsets', () => {
    for (const value of [
      '2023-12-06T19:01:07Z',
      '2023-12-06T19:01:07.5Z',
      '2023-12-06T19:01:07.512345Z',
      '2023-12-06T19:01Z',
      '2023-12-06T19:01:07+01:00',
      '2023-12-06T19:01:07.000-05:30',
    ]) {
      expect(safeParse(dateTimeSchema, value), value).toEqual({
        status: 'ok',
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
      expect(safeParse(dateTimeSchema, value).status, value).toBe('fail')
    }
  })
})
