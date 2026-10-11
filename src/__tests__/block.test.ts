import {describe, expect, test} from 'vitest'

import {block} from '../creators/block'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {portableText} from '../creators/portableText'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {parse} from '../parse'

describe('parsing blocks', () => {
  const RichBlock = block({
    style: union([literal('normal'), literal('h1')]),
    list: union([literal('bullet'), literal('number')]),
    decorator: union([literal('strong'), literal('em')]),
    inline: object({_type: literal('mention'), userId: string()}),
    annotation: object({_type: literal('link'), href: string()}),
  })

  test('parses a block the way Sanity stores it', () => {
    const value = {
      _type: 'block',
      style: 'h1',
      listItem: 'bullet',
      level: 1,
      markDefs: [{_type: 'link', _key: 'l1', href: 'https://example.com'}],
      children: [
        {_type: 'span', _key: 's1', text: 'Hello ', marks: ['strong']},
        // marks reference markDefs by `_key`
        {_type: 'span', _key: 's2', text: 'world', marks: ['l1']},
        {_type: 'mention', _key: 'm1', userId: 'u1'},
      ],
    }
    expect(parse(RichBlock, value)).toEqual({ok: true, value})
  })

  test('style, listItem, level and markDefs are optional', () => {
    const value = {
      _type: 'block',
      children: [{_type: 'span', _key: 's1', text: 'hi', marks: []}],
    }
    expect(parse(RichBlock, value)).toEqual({ok: true, value})
  })

  test('rejects values outside the configured styles and lists', () => {
    const base = {
      _type: 'block',
      children: [{_type: 'span', _key: 's1', text: 'hi', marks: []}],
    }
    expect(parse(RichBlock, {...base, style: 'h3'}).ok).toBe(false)
    expect(parse(RichBlock, {...base, listItem: 'checkbox'}).ok).toBe(false)
    expect(
      parse(RichBlock, {
        ...base,
        children: [{_type: 'span', text: 'no key', marks: []}],
      }).ok,
    ).toBe(false)
    expect(
      parse(RichBlock, {
        ...base,
        markDefs: [{_type: 'other', _key: 'x'}],
      }).ok,
    ).toBe(false)
  })

  test('an unconfigured block accepts any style and no markDefs', () => {
    const Plain = block({})
    const value = {
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 's1', text: 'hi', marks: []}],
    }
    expect(parse(Plain, value)).toEqual({ok: true, value})
    expect(
      parse(Plain, {...value, markDefs: [{_type: 'link', _key: 'k'}]}).ok,
    ).toBe(false)
  })
})

describe('parsing portable text', () => {
  const Body = portableText({
    block: block({decorator: literal('strong')}),
    element: object({_type: literal('image'), url: string()}),
  })

  test('parses blocks and custom elements', () => {
    const value = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 's1', text: 'hi', marks: []}],
      },
      {_type: 'image', _key: 'i1', url: 'https://example.com/a.png'},
    ]
    expect(parse(Body, value)).toEqual({ok: true, value})
  })

  test('requires _key on every element', () => {
    expect(
      parse(Body, [{_type: 'image', url: 'https://example.com/a.png'}]).ok,
    ).toBe(false)
  })
})
