import {assert, assertType, describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {file} from '../creators/file'
import {image} from '../creators/image'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {REF_SCHEMA, type SanityObjectType, type SanityType} from '../defs'
import {
  formatIssues,
  formatPath,
  parse,
  ParseError,
  type ParseIssue,
  parseOrThrow,
} from '../parse'
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
              "code": "INVALID_TYPE",
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
          "message": "Invalid input at [_key=="key213s"].nested.foo: Expected a string",
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

  test('message is the formatted list of issues', () => {
    const schema = object({
      items: array(object({_type: literal('item'), text: string()})),
    })
    const result = parse(schema, {
      items: [{_type: 'item', _key: 'k1', text: 1}],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.name).toBe('ParseError')
    expect(result.error.message).toBe(formatIssues(result.error.issues))
    expect(result.error.message).toBe(
      'Invalid input at items[_key=="k1"].text: Expected a string',
    )
  })

  test('issues leave out the rejected value unless reportInput is set', () => {
    const schema = object({name: string(), age: number()})
    const input = {name: 1, age: 'old'}

    const result = parse(schema, input)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.issues).toEqual([
      {path: ['name'], code: 'INVALID_TYPE', message: 'Expected a string'},
      {
        path: ['age'],
        code: 'INVALID_TYPE',
        message: 'Expected a finite number',
      },
    ])
    for (const issue of result.error.issues) {
      expect(issue).not.toHaveProperty('input')
    }
    expect(result.error.message).toMatchInlineSnapshot(`
      "Invalid input (2 issues):
        name: Expected a string
        age: Expected a finite number"
    `)

    const reported = parse(schema, input, {reportInput: true})
    expect(reported.ok).toBe(false)
    if (reported.ok) return
    expect(reported.error.issues).toEqual([
      {
        path: ['name'],
        code: 'INVALID_TYPE',
        input: 1,
        message: 'Expected a string',
      },
      {
        path: ['age'],
        code: 'INVALID_TYPE',
        input: 'old',
        message: 'Expected a finite number',
      },
    ])
    expect(reported.error.message).toMatchInlineSnapshot(`
      "Invalid input (2 issues):
        name: Expected a string, got 1
        age: Expected a finite number, got "old""
    `)

    let thrown: unknown
    try {
      parseOrThrow(schema, input, {reportInput: true})
    } catch (err) {
      thrown = err
    }
    expect((thrown as ParseError).issues).toEqual(reported.error.issues)
  })

  test('array items without a _key report the item as input', () => {
    const schema = array(object({_type: literal('item')}))
    const result = parse(schema, [{_type: 'item'}], {reportInput: true})
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
  })

  test('quotes, escapes and caps _key, which comes from the input', () => {
    expect(formatPath([{_key: 'a"b', index: 0}])).toBe('[_key=="a\\"b"]')
    expect(formatPath([{_key: 'a\\b', index: 0}])).toBe('[_key=="a\\\\b"]')
    expect(formatPath([{_key: 'a\nb', index: 0}])).toBe('[_key=="a\\nb"]')
    expect(formatPath([{_key: 'k'.repeat(100), index: 0}])).toBe(
      `[_key=="${'k'.repeat(79)}…"]`,
    )
  })

  test('tolerates segments outside the declared types', () => {
    expect(formatPath([null as any, {key: {_key: 1}} as any])).toBe(
      '[null][[object Object]]',
    )
  })
})

describe('formatIssues', () => {
  test('one issue fits on a single line', () => {
    const issue: ParseIssue = {
      path: ['name'],
      code: 'INVALID_TYPE',
      input: 42,
      message: 'Expected a string',
    }
    expect(formatIssues([issue])).toBe(
      'Invalid input at name: Expected a string, got 42',
    )
  })

  test('several issues are listed one per line', () => {
    const Pet = document({
      _type: literal('pet'),
      name: string(),
      age: number(),
      tags: array(string()),
    })
    const result = parse(
      Pet,
      {
        _type: 'pet',
        name: 42,
        tags: ['a', 1],
      },
      {reportInput: true},
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(formatIssues(result.error.issues)).toMatchInlineSnapshot(`
      "Invalid input (3 issues):
        name: Expected a string, got 42
        age: Expected a finite number, got undefined
        tags[1]: Expected a string, got 1"
    `)
  })

  test('shows the rejected value, truncated when it is large', () => {
    const issue: ParseIssue = {
      path: [],
      code: 'INVALID_TYPE',
      input: {a: 1, b: 2, c: 3, d: {e: {f: {g: 1}}}},
      message: 'Expected an object with keys {name}',
    }
    expect(formatIssues([issue])).toMatchInlineSnapshot(
      `"Invalid input at <root>: Expected an object with keys {name}, got {a: 1, b: 2, …(+2)}"`,
    )
  })

  test('an empty list is a plain "Invalid input"', () => {
    expect(formatIssues([])).toBe('Invalid input')
  })

  test('a message stays bounded and single-line for hostile input', () => {
    const schema = object({
      items: array(
        union([
          object({_type: literal('a'), n: number()}),
          object({_type: literal('b')}),
        ]),
      ),
    })
    const hostile = {
      items: [
        {_type: 'a', _key: 'x"]\n  name: Expected a string\n  y', n: 'no'},
        {_type: 'z'.repeat(500) + '\nsecret', _key: 'k2'},
        {_type: 'a', _key: 'k3', n: 'q'.repeat(500)},
      ],
    }
    for (const options of [undefined, {reportInput: true}]) {
      const result = parse(schema, hostile, options)
      expect(result.ok).toBe(false)
      if (result.ok) return
      const lines = result.error.message.split('\n')
      expect(lines).toHaveLength(1 + result.error.issues.length)
      for (const line of lines) expect(line.length).toBeLessThan(300)
    }
    const result = parse(schema, hostile)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toMatchInlineSnapshot(`
      "Invalid input (3 issues):
        items[_key=="x\\"]\\n  name: Expected a string\\n  y"].n: Expected a finite number
        items[_key=="k2"]: Type "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz…" not found among valid union types
        items[_key=="k3"].n: Expected a finite number"
    `)
  })

  test('reportInput survives input without a usable constructor', () => {
    const result = parse(string(), JSON.parse('{"constructor": null}'), {
      reportInput: true,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toBe(
      'Invalid input at <root>: Expected a string, got {constructor: null}',
    )
    const bare = parse(string(), Object.create(null), {reportInput: true})
    expect(bare.ok).toBe(false)
    if (bare.ok) return
    expect(bare.error.message).toBe(
      'Invalid input at <root>: Expected a string, got {}',
    )
  })

  test('accepts the issues of a Standard Schema validate result', () => {
    const Pet = document({
      _type: literal('pet'),
      name: string(),
      tags: array(object({_type: literal('tag'), label: string()})),
    })
    const result = Pet['~standard'].validate({
      _type: 'pet',
      name: 42,
      tags: [{_type: 'tag', _key: 'k1', label: 1}],
    })
    assert('issues' in result && result.issues)
    expect(formatIssues(result.issues)).toMatchInlineSnapshot(`
      "Invalid input (2 issues):
        name: Expected a string
        tags[_key=="k1"].label: Expected a string"
    `)
  })

  test('accepts issues from any Standard Schema library', () => {
    // Issues as another library might produce them: plain keys, `{key}`
    // segments, no path, and no `input`, so no "got" suffix
    expect(
      formatIssues([
        {message: 'Required', path: ['user', {key: 'emails'}, 0]},
        {message: 'Too short', path: [Symbol('id')], input: 'ab'},
        {message: 'Expected object'},
      ]),
    ).toMatchInlineSnapshot(`
      "Invalid input (3 issues):
        user.emails[0]: Required
        [Symbol(id)]: Too short, got "ab"
        <root>: Expected object"
    `)
  })
})
