import {expect, test} from 'vitest'

import {block} from '../creators/block'
import {image} from '../creators/image'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {portableText} from '../creators/portableText'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {parse} from '../parse'

test('a member of a nested union in portableText() reports only its own issues', () => {
  const Body = portableText({
    block: block({}),
    element: union([
      image({alt: string()}),
      object({_type: literal('codeBlock'), code: string()}),
    ]),
  })
  const result = parse(Body, [
    {_type: 'image', _key: 'i1', asset: {_type: 'reference', _ref: 'x'}},
  ])
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error.issues).toEqual([
    {
      code: 'INVALID_TYPE',
      message: 'Expected a string',
      path: [{_key: 'i1', index: 0}, 'alt'],
    },
  ])
})

test('a member of a two-level union() reports only its own issues', () => {
  const Inner = union([
    object({_type: literal('b'), n: number()}),
    object({_type: literal('c')}),
  ])
  const Outer = union([object({_type: literal('a')}), Inner])

  const result = parse(Outer, {_type: 'b', n: 'one'})
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error.issues).toEqual([
    {code: 'INVALID_TYPE', message: 'Expected a finite number', path: ['n']},
  ])
  expect(parse(Outer, {_type: 'b', n: 1})).toEqual({
    ok: true,
    value: {_type: 'b', n: 1},
  })
})
