import {describe, expect, test} from 'vitest'

import {locatePath} from './hujson'

const text = `{
  "_type": "post",
  "title": 42,
  "tags": ["a", 1],
  "body": [{"_key": "k1", "_type": "block", "text": 1}],
  "author": {"name": 1}
}`

function located(path: Parameters<typeof locatePath>[1]): string | null {
  const range = locatePath(text, path)
  return range ? text.slice(range.from, range.to) : null
}

describe('locatePath', () => {
  test('points at a field value', () => {
    expect(located(['title'])).toBe('42')
  })

  test('points at array items by index', () => {
    expect(located(['tags', 1])).toBe('1')
  })

  test('points at items in arrays of objects by their _key and index', () => {
    expect(located(['body', {_key: 'k1', index: 0}, 'text'])).toBe('1')
  })

  test('points at the _type value of an object that has one', () => {
    expect(located(['body', {_key: 'k1', index: 0}])).toBe('"block"')
  })

  test('points at the opening brace of an object without a _type', () => {
    expect(located(['author'])).toBe('{')
  })

  test('points at the opening brace of the object a missing field belongs in', () => {
    expect(located(['author', 'email'])).toBe('{')
    expect(located(['subtitle'])).toBe('{')
    expect(locatePath(text, ['subtitle'])?.from).toBe(0)
  })

  test('points at the opening bracket of an array with a missing item', () => {
    expect(located(['tags', 5])).toBe('[')
  })

  test('returns null for text that is not JSON', () => {
    expect(locatePath('', ['title'])).toBeNull()
  })
})
