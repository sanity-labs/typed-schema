import {expect, test} from 'vitest'

import {array} from '../../creators/array'
import {block} from '../../creators/block'
import {document} from '../../creators/document'
import {file} from '../../creators/file'
import {image} from '../../creators/image'
import {lazy} from '../../creators/lazy'
import {literal} from '../../creators/literal'
import {number} from '../../creators/number'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {string} from '../../creators/string'
import {union} from '../../creators/union'
import {deepPartial} from '../../utils/deepPartial'
import {deepRequired} from '../../utils/deepRequired'
import {
  DuplicateTypeNameError,
  verifyUniqueTypeNames,
} from '../verifyUniqueTypeNames'

test('accepts schemas with unique type names', () => {
  expect(() => verifyUniqueTypeNames(string())).not.toThrow()
  expect(() => verifyUniqueTypeNames(number())).not.toThrow()
  expect(() => verifyUniqueTypeNames(union([string(), number()]))).not.toThrow()
  expect(() =>
    verifyUniqueTypeNames(array(union([string(), number()]))),
  ).not.toThrow()
  expect(() => verifyUniqueTypeNames(literal('foo'))).not.toThrow()
  expect(() => verifyUniqueTypeNames(object({foo: string()}))).not.toThrow()
  expect(() =>
    verifyUniqueTypeNames(object({_type: literal('bar')})),
  ).not.toThrow()
  expect(() =>
    verifyUniqueTypeNames(array(object({_type: literal('bar')}))),
  ).not.toThrow()
  expect(() =>
    verifyUniqueTypeNames(
      array(
        union([
          object({_type: literal('foo')}),
          object({_type: literal('bar')}),
        ]),
      ),
    ),
  ).not.toThrow()
  expect(() =>
    verifyUniqueTypeNames(
      document({
        _type: literal('testdoc'),
        nested: array(
          union([
            object({
              _type: literal('foo'),
              optional: optional(
                object({
                  _type: literal('optional'),
                }),
              ),
            }),
            object({_type: literal('bar')}),
          ]),
        ),
      }),
    ),
  ).not.toThrow()
})

test('rejects schemas with duplicate type names', () => {
  expect(() =>
    verifyUniqueTypeNames(
      object({_type: literal('bar'), inner: object({_type: literal('bar')})}),
    ),
  ).toThrow(DuplicateTypeNameError)
  expect(() =>
    verifyUniqueTypeNames(
      array(
        union([
          object({_type: literal('foo')}),
          object({
            _type: literal('bar'),
            inner: object({_type: literal('bar')}),
          }),
        ]),
      ),
    ),
  ).toThrowErrorMatchingInlineSnapshot(`
    [DuplicateTypeNameError: Duplicate type names in schema:
      _type "bar" at bar, bar -> inner]
  `)
  expect(() =>
    verifyUniqueTypeNames(
      document({
        _type: literal('test'),
        nested: array(
          union([
            object({
              _type: literal('foo'),
              optional: optional(
                object({
                  _type: literal('bar'),
                }),
              ),
            }),
            object({_type: literal('bar')}),
          ]),
        ),
      }),
    ),
  ).toThrowErrorMatchingInlineSnapshot(`
    [DuplicateTypeNameError: Duplicate type names in schema:
      _type "bar" at nested -> foo -> optional, nested -> bar]
  `)
})

test('lists each duplicate on its own indented line', () => {
  let error: unknown
  try {
    verifyUniqueTypeNames(
      object({
        _type: literal('root'),
        author: object({_type: literal('person')}),
        reviewer: object({_type: literal('person')}),
        a: object({_type: literal('a'), b: object({_type: literal('tag')})}),
        c: object({_type: literal('tag')}),
      }),
    )
  } catch (err) {
    error = err
  }
  expect(error).toBeInstanceOf(DuplicateTypeNameError)
  expect((error as Error).name).toBe('DuplicateTypeNameError')
  expect((error as Error).message).toBe(
    [
      'Duplicate type names in schema:',
      '  _type "person" at author, reviewer',
      '  _type "tag" at a -> b, c',
    ].join('\n'),
  )
  expect(String(error)).toMatch(/^DuplicateTypeNameError: /)
})

test('returns the schema and lists duplicates on the error', () => {
  const schema = object({_type: literal('foo'), name: string()})
  expect(verifyUniqueTypeNames(schema)).toBe(schema)

  let error: unknown
  try {
    verifyUniqueTypeNames(
      object({_type: literal('bar'), inner: object({_type: literal('bar')})}),
    )
  } catch (err) {
    error = err
  }
  expect(error).toBeInstanceOf(DuplicateTypeNameError)
  expect((error as DuplicateTypeNameError).duplicates).toEqual([
    {name: 'bar', paths: [[], ['inner']]},
  ])
})

const Person = object({_type: literal('person'), name: string()})

test('accepts the same schema reused in several places', () => {
  expect(() =>
    verifyUniqueTypeNames(
      document({
        _type: literal('post'),
        author: Person,
        reviewer: Person,
        contributors: array(Person),
        mentions: array(
          union([Person, object({_type: literal('team'), name: string()})]),
        ),
        credits: optional(object({_type: literal('credits'), lead: Person})),
      }),
    ),
  ).not.toThrow()
})

test('rejects two declarations of one _type even if their shapes are identical', () => {
  expect(() =>
    verifyUniqueTypeNames(
      document({
        _type: literal('post'),
        author: Person,
        reviewer: Person,
        editor: object({_type: literal('person'), name: string()}),
      }),
    ),
  ).toThrowErrorMatchingInlineSnapshot(
    `
    [DuplicateTypeNameError: Duplicate type names in schema:
      _type "person" at author, reviewer, editor]
  `,
  )
})

test('walks fields declared with getters and lazy()', () => {
  expect(() =>
    verifyUniqueTypeNames(
      document({
        _type: literal('post'),
        author: Person,
        get reviewer() {
          return object({_type: literal('person'), name: string()})
        },
      }),
    ),
  ).toThrowErrorMatchingInlineSnapshot(
    `
    [DuplicateTypeNameError: Duplicate type names in schema:
      _type "person" at author, reviewer]
  `,
  )
  expect(() =>
    verifyUniqueTypeNames(
      document({
        _type: literal('post'),
        author: Person,
        reviewer: lazy(() =>
          object({_type: literal('person'), name: string()}),
        ),
      }),
    ),
  ).toThrowErrorMatchingInlineSnapshot(
    `
    [DuplicateTypeNameError: Duplicate type names in schema:
      _type "person" at author, reviewer]
  `,
  )
})

test('walks the custom fields of images and files', () => {
  expect(() =>
    verifyUniqueTypeNames(
      document({
        _type: literal('post'),
        author: Person,
        cover: image({
          photographer: object({_type: literal('person'), name: string()}),
        }),
      }),
    ),
  ).toThrowErrorMatchingInlineSnapshot(
    `
    [DuplicateTypeNameError: Duplicate type names in schema:
      _type "person" at author, cover -> photographer]
  `,
  )
  expect(() =>
    verifyUniqueTypeNames(
      document({
        _type: literal('post'),
        author: Person,
        attachment: file({
          uploader: object({_type: literal('person'), name: string()}),
        }),
      }),
    ),
  ).toThrowErrorMatchingInlineSnapshot(
    `
    [DuplicateTypeNameError: Duplicate type names in schema:
      _type "person" at author, attachment -> uploader]
  `,
  )
})

test('walks the inline and annotation types of blocks', () => {
  expect(() =>
    verifyUniqueTypeNames(
      document({
        _type: literal('post'),
        author: Person,
        body: array(
          block({
            inline: object({_type: literal('person'), name: string()}),
          }),
        ),
      }),
    ),
  ).toThrowErrorMatchingInlineSnapshot(
    `
    [DuplicateTypeNameError: Duplicate type names in schema:
      _type "person" at author, body -> children -> person]
  `,
  )
  expect(() =>
    verifyUniqueTypeNames(
      document({
        _type: literal('post'),
        author: Person,
        body: array(
          block({
            annotation: object({_type: literal('person'), name: string()}),
          }),
        ),
      }),
    ),
  ).toThrowErrorMatchingInlineSnapshot(
    `
    [DuplicateTypeNameError: Duplicate type names in schema:
      _type "person" at author, body -> markDefs]
  `,
  )
})

test('does not count the built-in image, file, block and span types', () => {
  expect(() =>
    verifyUniqueTypeNames(
      document({
        _type: literal('post'),
        cover: image({caption: string()}),
        thumbnail: image({alt: string()}),
        attachment: file({}),
        download: file({}),
        body: array(block({inline: Person})),
        summary: array(
          union([block({annotation: Person}), image({caption: string()})]),
        ),
      }),
    ),
  ).not.toThrow()
})

test('terminates on recursive schemas', () => {
  const Category = document({
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
  expect(() => verifyUniqueTypeNames(Category)).not.toThrow()
  expect(() => verifyUniqueTypeNames(Node)).not.toThrow()
  expect(() => verifyUniqueTypeNames(deepPartial(Category))).not.toThrow()
  expect(() => verifyUniqueTypeNames(deepRequired(Node))).not.toThrow()
})

test('finds duplicates inside recursive schemas', () => {
  const Node = object({
    _type: literal('node'),
    get next() {
      return optional(Node)
    },
    get other() {
      return optional(object({_type: literal('node')}))
    },
  })
  expect(() => verifyUniqueTypeNames(Node)).toThrowErrorMatchingInlineSnapshot(
    `
    [DuplicateTypeNameError: Duplicate type names in schema:
      _type "node" at (root), next, other]
  `,
  )
})
