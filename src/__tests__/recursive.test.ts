import {describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {strictMode} from '../helpers/strictMode'
import {parse, safeParse} from '../parse'
import {deepPartial} from '../utils/deepPartial'
import {deepRequired} from '../utils/deepRequired'
import {extend} from '../utils/extend'
import {required} from '../utils/required'
import {shallowRequired} from '../utils/shallowRequired'

const Category = object({
  _type: literal('category'),
  name: string(),
  get subcategories() {
    return array(Category)
  },
})

const Node = object({
  _type: literal('node'),
  value: string(),
  get next() {
    return optional(Node)
  },
})

const Person = document({
  _type: literal('person'),
  name: string(),
  get friends() {
    return array(reference(Person))
  },
})

const Folder = object({
  _type: literal('folder'),
  name: string(),
  get children() {
    return array(
      union([object({_type: literal('file'), name: string()}), Folder]),
    )
  },
})

describe('recursive schemas declared with getters', () => {
  test('parse nested values', () => {
    const value = {
      _type: 'category',
      name: 'a',
      subcategories: [
        {
          _type: 'category',
          _key: 'k1',
          name: 'b',
          subcategories: [
            {_type: 'category', _key: 'k2', name: 'c', subcategories: []},
          ],
        },
      ],
    }
    expect(parse(Category, value)).toEqual(value)
  })

  test('report errors at depth', () => {
    const result = safeParse(Category, {
      _type: 'category',
      name: 'a',
      subcategories: [
        {_type: 'category', _key: 'k1', name: 1, subcategories: []},
      ],
    })
    expect(result.status).toBe('fail')
    expect(result.status === 'fail' && result.errors[0]?.path).toEqual([
      'subcategories',
      'k1',
      'name',
    ])
  })

  test('optional self-reference', () => {
    expect(parse(Node, {_type: 'node', value: 'a'})).toEqual({
      _type: 'node',
      value: 'a',
    })
    expect(
      parse(Node, {
        _type: 'node',
        value: 'a',
        next: {_type: 'node', value: 'b'},
      }),
    ).toEqual({_type: 'node', value: 'a', next: {_type: 'node', value: 'b'}})
    expect(
      safeParse(Node, {_type: 'node', value: 'a', next: {_type: 'nope'}})
        .status,
    ).toBe('fail')
  })

  test('documents referencing themselves', () => {
    const value = {
      _type: 'person',
      _id: 'ann',
      name: 'Ann',
      friends: [{_type: 'reference', _ref: 'bob', _key: 'k1'}],
    }
    expect(parse(Person, value)).toEqual(value)
  })

  test('self-reference through a union', () => {
    const value = {
      _type: 'folder',
      name: 'root',
      children: [
        {_type: 'file', _key: 'k1', name: 'a.txt'},
        {_type: 'folder', _key: 'k2', name: 'sub', children: []},
      ],
    }
    expect(parse(Folder, value)).toEqual(value)
  })

  test('getters are not invoked when the schema is created', () => {
    let calls = 0
    const schema = document({
      _type: literal('counted'),
      get self() {
        calls++
        return optional(schema)
      },
    })
    expect(calls).toBe(0)
    parse(schema, {_type: 'counted'})
    parse(schema, {_type: 'counted', self: {_type: 'counted'}})
    // resolved once, then cached
    expect(calls).toBe(1)
  })

  test('schemas stay serializable', () => {
    expect(() => JSON.stringify(Category)).not.toThrow()
    expect(() => JSON.stringify(Person)).not.toThrow()
  })

  test('schema walkers terminate', () => {
    expect(() => strictMode(Folder)).not.toThrow()
  })

  test('deepPartial and deepRequired apply at every depth', () => {
    const Partial = deepPartial(Category)
    const value = {
      _type: 'category',
      subcategories: [{_type: 'category', _key: 'k1', subcategories: []}],
    }
    expect(parse(Partial, {_type: 'category'})).toEqual({_type: 'category'})
    expect(parse(Partial, value)).toEqual(value)

    const Required = deepRequired(Node)
    expect(
      safeParse(Required, {
        _type: 'node',
        value: 'a',
        next: {_type: 'node', value: 'b'},
      }).status,
    ).toBe('fail')
  })

  test('shallowRequired and required unwrap optional getter fields', () => {
    const Required = shallowRequired(Node)
    expect(safeParse(Required, {_type: 'node', value: 'a'}).status).toBe('fail')
    expect(
      parse(Required, {
        _type: 'node',
        value: 'a',
        next: {_type: 'node', value: 'b'},
      }),
    ).toEqual({_type: 'node', value: 'a', next: {_type: 'node', value: 'b'}})

    const RequiredString = required(lazy(() => optional(string())))
    expect(safeParse(RequiredString, undefined).status).toBe('fail')
    expect(parse(RequiredString, 'x')).toBe('x')
  })

  test('extend keeps getters deferred', () => {
    const Tree = extend(object({_type: literal('tree'), name: string()}), {
      get parent() {
        return optional(Tree)
      },
    })
    expect(
      parse(Tree, {
        _type: 'tree',
        name: 'a',
        parent: {_type: 'tree', name: 'b'},
      }),
    ).toEqual({_type: 'tree', name: 'a', parent: {_type: 'tree', name: 'b'}})
  })
})
