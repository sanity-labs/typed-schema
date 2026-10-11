import {expect, test} from 'vitest'

import {array} from '../../creators/array'
import {document} from '../../creators/document'
import {literal} from '../../creators/literal'
import {number} from '../../creators/number'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {string} from '../../creators/string'
import {union} from '../../creators/union'
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
  ).toThrowErrorMatchingInlineSnapshot(
    `[Error: Duplicate type names in schema: _type "bar" at bar, bar -> inner]`,
  )
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
  ).toThrowErrorMatchingInlineSnapshot(
    `[Error: Duplicate type names in schema: _type "bar" at nested -> foo -> optional, nested -> bar]`,
  )
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
