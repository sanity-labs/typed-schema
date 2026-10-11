import {describe, expect, test} from 'vitest'

import {
  applyLifecycle,
  formatLifecycle,
  type Lifecycle,
  lifecycleCode,
  parseLifecycle,
} from './lifecycle'

const ALL: Lifecycle[] = [
  {partial: false, committed: false},
  {partial: true, committed: false},
  {partial: false, committed: true},
  {partial: true, committed: true},
]

describe('lifecycle', () => {
  test.each(ALL)('round-trips through the URL form: %o', lifecycle => {
    expect(parseLifecycle(formatLifecycle(lifecycle))).toEqual(lifecycle)
  })

  test('applies partial() before committed(), as written in code', () => {
    const lifecycle = {partial: true, committed: true}
    expect(lifecycleCode(lifecycle, 'Author')).toBe(
      'committed(partial(Author))',
    )
    expect(
      applyLifecycle('Author', lifecycle, {
        partial: name => `partial(${name})`,
        committed: name => `committed(${name})`,
      }),
    ).toBe('committed(partial(Author))')
  })
})
