import {describe, expect, test} from 'vitest'

import {isObjectArraySchema} from '../asserters'
import {array, getUnkeyedSchema} from '../creators/array'
import {block} from '../creators/block'
import {document} from '../creators/document'
import {file} from '../creators/file'
import {image} from '../creators/image'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {portableText} from '../creators/portableText'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {type ObjectArraySchema} from '../defs'
import {getLazySchema} from '../helpers/getLazySchema'
import {verifyUniqueTypeNames} from '../helpers/verifyUniqueTypeNames'
import {parse} from '../parse'
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
    expect(parse(Category, value)).toEqual({ok: true, value})
  })

  test('report errors at depth', () => {
    const result = parse(Category, {
      _type: 'category',
      name: 'a',
      subcategories: [
        {_type: 'category', _key: 'k1', name: 1, subcategories: []},
      ],
    })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.issues[0]?.path).toEqual([
      'subcategories',
      {_key: 'k1', index: 0},
      'name',
    ])
  })

  test('optional self-reference', () => {
    expect(parse(Node, {_type: 'node', value: 'a'})).toEqual({
      ok: true,
      value: {
        _type: 'node',
        value: 'a',
      },
    })
    expect(
      parse(Node, {
        _type: 'node',
        value: 'a',
        next: {_type: 'node', value: 'b'},
      }),
    ).toEqual({
      ok: true,
      value: {_type: 'node', value: 'a', next: {_type: 'node', value: 'b'}},
    })
    expect(
      parse(Node, {_type: 'node', value: 'a', next: {_type: 'nope'}}).ok,
    ).toBe(false)
  })

  test('documents referencing themselves', () => {
    const value = {
      _type: 'person',
      _id: 'ann',
      name: 'Ann',
      friends: [{_type: 'reference', _ref: 'bob', _key: 'k1'}],
    }
    expect(parse(Person, value)).toEqual({ok: true, value})
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
    expect(parse(Folder, value)).toEqual({ok: true, value})
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
    expect(() => verifyUniqueTypeNames(Folder)).not.toThrow()
    expect(() => verifyUniqueTypeNames(deepPartial(Folder))).not.toThrow()
    expect(() => verifyUniqueTypeNames(deepRequired(Node))).not.toThrow()
  })

  test('deepPartial and deepRequired keep recursive schemas recursive', () => {
    const Partial = deepPartial(Category)
    expect(deepPartial(Category)).toBe(Partial)
    const subcategories = getLazySchema(Partial.shape.subcategories.type)
    expect(isObjectArraySchema(subcategories)).toBe(true)
    expect(getUnkeyedSchema((subcategories as ObjectArraySchema).element)).toBe(
      Partial,
    )
    expect(deepRequired(Node)).toBe(deepRequired(Node))
  })

  test('deepPartial and deepRequired apply at every depth', () => {
    const Partial = deepPartial(Category)
    const value = {
      _type: 'category',
      subcategories: [{_type: 'category', _key: 'k1', subcategories: []}],
    }
    expect(parse(Partial, {_type: 'category'})).toEqual({
      ok: true,
      value: {
        _type: 'category',
      },
    })
    expect(parse(Partial, value)).toEqual({ok: true, value})

    const Required = deepRequired(Node)
    expect(
      parse(Required, {
        _type: 'node',
        value: 'a',
        next: {_type: 'node', value: 'b'},
      }).ok,
    ).toBe(false)
  })

  test('shallowRequired and required unwrap optional getter fields', () => {
    const Required = shallowRequired(Node)
    expect(parse(Required, {_type: 'node', value: 'a'}).ok).toBe(false)
    expect(
      parse(Required, {
        _type: 'node',
        value: 'a',
        next: {_type: 'node', value: 'b'},
      }),
    ).toEqual({
      ok: true,
      value: {_type: 'node', value: 'a', next: {_type: 'node', value: 'b'}},
    })

    const RequiredString = required(lazy(() => optional(string())))
    expect(parse(RequiredString, undefined).ok).toBe(false)
    expect(parse(RequiredString, 'x')).toEqual({ok: true, value: 'x'})
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
    ).toEqual({
      ok: true,
      value: {_type: 'tree', name: 'a', parent: {_type: 'tree', name: 'b'}},
    })
  })

  test('self-reference inside image and file fields', () => {
    const Gallery = object({
      _type: literal('gallery'),
      title: string(),
      cover: optional(
        image({
          get related() {
            return optional(Gallery)
          },
        }),
      ),
      attachment: optional(
        file({
          get gallery() {
            return optional(Gallery)
          },
        }),
      ),
    })
    const asset = {_type: 'reference', _ref: 'a'}
    const value = {
      _type: 'gallery',
      title: 'a',
      cover: {
        _type: 'image',
        asset,
        related: {_type: 'gallery', title: 'b'},
      },
      attachment: {
        _type: 'file',
        asset,
        gallery: {_type: 'gallery', title: 'c'},
      },
    }
    expect(parse(Gallery, value)).toEqual({ok: true, value})
    expect(
      parse(Gallery, {
        ...value,
        cover: {...value.cover, related: {_type: 'gallery', title: 1}},
      }).ok,
    ).toBe(false)
  })

  test('self-reference through images, files and references in Portable Text and unions', () => {
    const Figure = image({
      alt: string(),
      get caption() {
        return portableText({
          block: block({inline: Figure, annotation: Attachment}),
          element: union([Figure, Attachment]),
        })
      },
    })
    const Attachment = file({
      title: string(),
      get related() {
        return array(union([reference(Article), Attachment]))
      },
    })
    const Article = document({
      _type: literal('article'),
      title: string(),
      get body() {
        return portableText({
          block: block({annotation: reference(Article)}),
          element: union([Figure, reference(Article)]),
        })
      },
    })
    const asset = {_type: 'reference', _ref: 'a'}
    const value = {
      _type: 'article',
      _id: 'a1',
      title: 'a',
      body: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 't', marks: ['m1']}],
          markDefs: [{_type: 'reference', _key: 'm1', _ref: 'a2'}],
        },
        {_type: 'reference', _key: 'r1', _ref: 'a3'},
        {
          _type: 'image',
          _key: 'f1',
          asset,
          alt: 'figure',
          caption: [
            {
              _type: 'block',
              _key: 'b2',
              children: [
                {_type: 'span', _key: 's2', text: 't', marks: ['m2']},
                {_type: 'image', _key: 'f2', asset, alt: 'inline', caption: []},
              ],
              markDefs: [
                {
                  _type: 'file',
                  _key: 'm2',
                  asset,
                  title: 'note',
                  related: [{_type: 'reference', _key: 'r2', _ref: 'a4'}],
                },
              ],
            },
            {
              _type: 'file',
              _key: 'a1',
              asset,
              title: 'attachment',
              related: [
                {
                  _type: 'file',
                  _key: 'a2',
                  asset,
                  title: 'nested',
                  related: [],
                },
              ],
            },
          ],
        },
      ],
    }
    expect(parse(Article, value)).toEqual({ok: true, value})

    const figure = value.body[2]!
    const invalid = {
      ...value,
      body: [
        value.body[0],
        value.body[1],
        {
          ...figure,
          caption: [
            {
              _type: 'image',
              _key: 'f3',
              asset,
              alt: 1,
              caption: [],
            },
          ],
        },
      ],
    }
    const result = parse(Article, invalid)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error.issues).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_TYPE',
        path: [
          'body',
          {_key: 'f1', index: 2},
          'caption',
          {_key: 'f3', index: 0},
          'alt',
        ],
      }),
    )
  })
})
