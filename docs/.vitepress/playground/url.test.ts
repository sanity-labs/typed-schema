import {describe, expect, test} from 'vitest'

import {buildUrl, type PlaygroundState, readUrl} from './url'

const BASE = 'https://example.com/typed-schema/playground'

describe('playground links', () => {
  test('round-trip the example, tab, lifecycle, refSchema, code and input', () => {
    const state: PlaygroundState = {
      example: 'event',
      tab: 'input',
      lifecycle: {partial: true, committed: true},
      refSchema: true,
      code: "import * as s from '@sanity-labs/typed-schema'\n// a + b",
      input: '{"title": "Café"}',
    }
    const url = buildUrl(state, BASE)
    expect(url.search).toBe(
      '?example=event&tab=validate&lifecycle=committed-partial&refSchema=show',
    )
    expect(readUrl(url)).toEqual({...state, unreadable: false})
  })

  test('leave out defaults and unedited code and input', () => {
    const url = buildUrl(
      {
        example: 'event',
        tab: 'type',
        lifecycle: {partial: false, committed: false},
        refSchema: false,
        code: null,
        input: null,
      },
      `${BASE}?tab=validate&refSchema=show#code=abc`,
    )
    expect(url.href).toBe(`${BASE}?example=event`)
  })

  test('report code or input that does not decode', () => {
    const state = readUrl({search: '', hash: '#code=%%%'})
    expect(state.code).toBeNull()
    expect(state.unreadable).toBe(true)
  })
})
