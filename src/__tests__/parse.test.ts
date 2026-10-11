import {assert, assertType, describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {file} from '../creators/file'
import {image} from '../creators/image'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {REF_SCHEMA, type SanityObjectType, type SanityType} from '../defs'
import {formatPath, parse, ParseError, parseOrThrow} from '../parse'
import {type SanityDocumentValue} from '../shapeDefs'

describe('string parsing', () => {
  test('successful parsing', () => {
    const schema = string()
    const parsed = parse(schema, 'foo')
    expect(parsed).toMatchObject({
      ok: true,
      value: 'foo',
    })
  })
  test('failed parsing', () => {
    const schema = string()
    const parsed = parse(schema, undefined)
    expect(parsed).toMatchObject({
      ok: false,
      error: {issues: [{path: [], code: 'INVALID_TYPE', message: /.+/}]},
    })
  })
})

describe('object parsing', () => {
  test('parsing of simple object', () => {
    const schema = object({foo: string()})
    const parsed = parse(schema, {foo: 'bar'})
    expect(parsed).toMatchObject({
      ok: true,
      value: {foo: 'bar'},
    })
  })
  test('parsing of complex object', () => {
    const schema = object({
      title: string(),
      nested: object({something: string()}),
    })
    const parsed = parse(schema, {
      title: 'hello',
      nested: {something: 'world'},
    })
    expect(parsed).toMatchObject({
      ok: true,
      value: {title: 'hello', nested: {something: 'world'}},
    })
  })
  test('failed parsing', () => {
    const schema = object({
      title: string(),
      nested: object({something: string()}),
    })
    const parsed = parse(schema, {title: 'hello', nested: {something: 1}})

    expect(parsed).toMatchObject({
      ok: false,
      error: {
        issues: [
          {path: ['nested', 'something'], code: 'INVALID_TYPE', message: /.+/},
        ],
      },
    })
  })
  describe('circular/lazy types', () => {
    test('circular/lazy', () => {
      type Person = {
        name: string
        parent?: Person
      }
      const Person: SanityType<Person> = object({
        name: string(),
        parent: optional(lazy(() => Person)),
      })

      const parsed = parse(Person, {
        name: 'Tester',
        parent: {name: "Tester's parent"},
      })

      expect(parsed).toEqual({
        ok: true,
        value: {name: 'Tester', parent: {name: "Tester's parent"}},
      })
    })
  })
  test('Circular object types', () => {
    interface Person {
      _type: 'person'
      name: string
      parent?: Person
    }

    const Person: SanityObjectType<Person> = object({
      _type: literal('person'),
      name: string(),
      parent: optional(lazy(() => Person)),
    })

    const parsedResult = parse(Person, {
      _type: 'person',
      name: 'foo',
      parent: {_type: 'person', name: 'another'},
    })
    assert(parsedResult.ok)
    const parsed = parsedResult.value

    expect(parsed).toEqual({
      _type: 'person',
      name: 'foo',
      parent: {_type: 'person', name: 'another'},
    })
  })

  test('circular/lazy references', () => {
    interface Human extends SanityDocumentValue {
      name: string
    }

    const Human: SanityType<Human> = document({
      _type: literal('human'),
      name: string(),
      pets: lazy(() => array(reference(Pet))),
    })

    const Pet = document({
      _type: literal('pet'),
      name: string(),
      owner: reference(Human),
    })

    const parsedResult = parse(Pet, {
      _type: 'pet',
      name: 'Jara',
      owner: {_type: 'reference', _ref: 'knut'},
    })
    assert(parsedResult.ok)
    const parsed = parsedResult.value
    expect(parsed).toEqual({
      _type: 'pet',
      name: 'Jara',
      owner: {
        _ref: 'knut',
        _type: 'reference',
      },
    })
    assertType<SanityType<Human>>(parsed.owner.$refSchema!)
  })
})

describe('object array parsing', () => {
  test('parsing of simple array', () => {
    const schema = array(object({foo: string()}))
    const parsed = parse(schema, [{_key: 'akey', foo: 'bar'}])
    expect(parsed).toMatchObject({
      ok: true,
      value: [{_key: 'akey', foo: 'bar'}],
    })
  })
  test('parsing of single union array', () => {
    const schema = array(
      union([object({_type: literal('foo'), foo: string()})]),
    )
    const parsed = parse(schema, [{_key: 'somekey', _type: 'foo', foo: 'bar'}])
    expect(parsed).toMatchObject({
      ok: true,
      value: [{_key: 'somekey', _type: 'foo', foo: 'bar'}],
    })
  })
  test('parsing of multi union array', () => {
    const schema = array(
      union([
        object({_type: literal('foo'), fooProp: string()}),
        object({_type: literal('bar'), barProp: string()}),
      ]),
    )
    const parsed = parse(schema, [
      {_type: 'foo', _key: 'somekey', fooProp: 'foo'},
    ])
    expect(parsed).toMatchObject({
      ok: true,
      value: [{_type: 'foo', _key: 'somekey', fooProp: 'foo'}],
    })
  })
  test('failed parsing', () => {
    const schema = array(
      union([
        object({_type: literal('foo'), nested: object({foo: string()})}),
        object({_type: literal('bar'), barProp: string()}),
      ]),
    )
    const parsed = parse(schema, [
      {_type: 'foo', _key: 'key213s', nested: {foo: 1}},
    ])

    expect(parsed).toMatchInlineSnapshot(`
      {
        "error": ParseError {
          "issues": [
            {
              "code": "INVALID_OBJECT_UNION",
              "input": {
                "_key": "key213s",
                "_type": "foo",
                "nested": {
                  "foo": 1,
                },
              },
              "message": "Cannot parse input as union type "foo"",
              "path": [
                {
                  "_key": "key213s",
                  "index": 0,
                },
              ],
            },
            {
              "code": "INVALID_TYPE",
              "input": 1,
              "message": "Expected a string",
              "path": [
                {
                  "_key": "key213s",
                  "index": 0,
                },
                "nested",
                "foo",
              ],
            },
          ],
          "message": "Invalid input at "[_key=="key213s"]": Cannot parse input as union type "foo" (+ 1)",
        },
        "ok": false,
      }
    `)
  })
})

describe('reference parsing', () => {
  test('parsing of simple reference', () => {
    const Person = document({_type: literal('person'), name: string()})
    const Reference = reference(Person)

    const parsedResult = parse(Reference, {
      _ref: 'some-person',
      _type: 'reference',
    })
    assert(parsedResult.ok)
    const parsed = parsedResult.value

    expect(parsed[REF_SCHEMA]?.typeName).toBe('document')

    expect(parsed).toEqual({
      _ref: 'some-person',
      _type: 'reference',
    })
  })

  test('the referenced schema never serializes and is lost on copy', () => {
    const Person = document({_type: literal('person'), name: string()})
    const parsedResult = parse(reference(Person), {
      _ref: 'some-person',
      _type: 'reference',
    })
    assert(parsedResult.ok)
    const parsed = parsedResult.value

    expect(parsed.$refSchema).toBe(Person)
    expect(Object.keys(parsed)).not.toContain('$refSchema')
    expect(JSON.parse(JSON.stringify(parsed))).toEqual({
      _ref: 'some-person',
      _type: 'reference',
    })
    expect({...parsed}.$refSchema).toBeUndefined()
  })
})

describe('asset parsing', () => {
  test('parsing of image', () => {
    const ImageSchema = image({caption: string()})

    const parsedResult = parse(ImageSchema, {
      _type: 'image',
      caption: 'A nice pic of my favourite lizard, Leon.',
      asset: {
        _type: 'reference',
        _ref: 'xxx',
      },
    })
    assert(parsedResult.ok)
    const parsed = parsedResult.value

    expect(parsed).toEqual({
      _type: 'image',
      caption: 'A nice pic of my favourite lizard, Leon.',
      asset: {
        _type: 'reference',
        _ref: 'xxx',
      },
    })
  })
  test('parsing of file', () => {
    const FileSchema = file({caption: string()})

    const parsedResult = parse(FileSchema, {
      _type: 'file',
      asset: {
        _type: 'reference',
        _ref: '123',
      },
      caption: 'An absolutely tip-top file for you.',
    })
    assert(parsedResult.ok)
    const parsed = parsedResult.value

    expect(parsed).toEqual({
      _type: 'file',
      asset: {
        _type: 'reference',
        _ref: '123',
      },
      caption: 'An absolutely tip-top file for you.',
    })
  })
})

describe('ParseError', () => {
  test('parseOrThrow throws the error a failed parse result holds', () => {
    const schema = object({name: string()})
    const result = parse(schema, {name: 1})
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBeInstanceOf(ParseError)
    let thrown: unknown
    try {
      parseOrThrow(schema, {name: 1})
    } catch (err) {
      thrown = err
    }
    expect(thrown).toBeInstanceOf(ParseError)
    expect((thrown as ParseError).message).toBe(result.error.message)
    expect((thrown as ParseError).issues).toEqual(result.error.issues)
  })

  test('message summarises the first issue with its path', () => {
    const schema = object({
      items: array(object({_type: literal('item'), text: string()})),
    })
    const result = parse(schema, {
      items: [{_type: 'item', _key: 'k1', text: 1}],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toBe(
      'Invalid input at "items[_key=="k1"].text": Expected a string',
    )
  })

  test('array items without a _key report the item as input', () => {
    const schema = array(object({_type: literal('item')}))
    const result = parse(schema, [{_type: 'item'}])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.issues).toEqual([
      {
        code: 'ARRAY_ELEMENT_NOT_KEYED_OBJECT',
        input: {_type: 'item'},
        path: [0],
        message: 'Expected an object with a "_key" property',
      },
    ])
  })
})

describe('formatPath', () => {
  test('renders fields, indexes and keys like a Sanity path', () => {
    expect(formatPath([])).toBe('<root>')
    expect(formatPath(['name'])).toBe('name')
    expect(formatPath(['tags', 0])).toBe('tags[0]')
    expect(
      formatPath(['body', {_key: 'abc', index: 2}, 'children', 0, 'text']),
    ).toBe('body[_key=="abc"].children[0].text')
    expect(formatPath([0, 'a'])).toBe('[0].a')
    expect(formatPath([{_key: 'a"b', index: 0}])).toBe('[_key=="a\\"b"]')
  })
})
