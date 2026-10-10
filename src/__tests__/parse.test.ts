import {assertType, describe, expect, test} from 'vitest'

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
import {parse, safeParse} from '../parse'
import {type SanityDocumentValue} from '../shapeDefs'

describe('string parsing', () => {
  test('successful parsing', () => {
    const schema = string()
    const parsed = safeParse(schema, 'foo')
    expect(parsed).toMatchObject({
      status: 'ok',
      value: 'foo',
    })
  })
  test('failed parsing', () => {
    const schema = string()
    const parsed = safeParse(schema, undefined)
    expect(parsed).toMatchObject({
      status: 'fail',
      errors: [{path: [], code: 'INVALID_TYPE', message: /.+/}],
    })
  })
})

describe('object parsing', () => {
  test('parsing of simple object', () => {
    const schema = object({foo: string()})
    const parsed = safeParse(schema, {foo: 'bar'})
    expect(parsed).toMatchObject({
      status: 'ok',
      value: {foo: 'bar'},
    })
  })
  test('parsing of complex object', () => {
    const schema = object({
      title: string(),
      nested: object({something: string()}),
    })
    const parsed = safeParse(schema, {
      title: 'hello',
      nested: {something: 'world'},
    })
    expect(parsed).toMatchObject({
      status: 'ok',
      value: {title: 'hello', nested: {something: 'world'}},
    })
  })
  test('failed parsing', () => {
    const schema = object({
      title: string(),
      nested: object({something: string()}),
    })
    const parsed = safeParse(schema, {title: 'hello', nested: {something: 1}})

    expect(parsed).toMatchObject({
      status: 'fail',
      errors: [
        {path: ['nested', 'something'], code: 'INVALID_TYPE', message: /.+/},
      ],
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

      const parsed = safeParse(Person, {
        name: 'Tester',
        parent: {name: "Tester's parent"},
      })

      expect(parsed).toEqual({
        status: 'ok',
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

    const parsed = parse(Person, {
      _type: 'person',
      name: 'foo',
      parent: {_type: 'person', name: 'another'},
    })

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

    const parsed = parse(Pet, {
      _type: 'pet',
      name: 'Jara',
      owner: {_type: 'reference', _ref: 'knut'},
    })
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
    const parsed = safeParse(schema, [{_key: 'akey', foo: 'bar'}])
    expect(parsed).toMatchObject({
      status: 'ok',
      value: [{_key: 'akey', foo: 'bar'}],
    })
  })
  test('parsing of single union array', () => {
    const schema = array(
      union([object({_type: literal('foo'), foo: string()})]),
    )
    const parsed = safeParse(schema, [
      {_key: 'somekey', _type: 'foo', foo: 'bar'},
    ])
    expect(parsed).toMatchObject({
      status: 'ok',
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
    const parsed = safeParse(schema, [
      {_type: 'foo', _key: 'somekey', fooProp: 'foo'},
    ])
    expect(parsed).toMatchObject({
      status: 'ok',
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
    const parsed = safeParse(schema, [
      {_type: 'foo', _key: 'key213s', nested: {foo: 1}},
    ])

    expect(parsed).toMatchInlineSnapshot(`
      {
        "errors": [
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
              "key213s",
            ],
          },
          {
            "code": "INVALID_TYPE",
            "input": 1,
            "message": "Expected a string",
            "path": [
              "key213s",
              "nested",
              "foo",
            ],
          },
        ],
        "status": "fail",
      }
    `)
  })
})

describe('reference parsing', () => {
  test('parsing of simple reference', () => {
    const Person = document({_type: literal('person'), name: string()})
    const Reference = reference(Person)

    const parsed = parse(Reference, {
      _ref: 'some-person',
      _type: 'reference',
    })

    expect(parsed[REF_SCHEMA]?.typeName).toBe('document')

    expect(parsed).toEqual({
      _ref: 'some-person',
      _type: 'reference',
    })
  })

  test('the referenced schema never serializes and is lost on copy', () => {
    const Person = document({_type: literal('person'), name: string()})
    const parsed = parse(reference(Person), {
      _ref: 'some-person',
      _type: 'reference',
    })

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

    const parsed = parse(ImageSchema, {
      _type: 'image',
      caption: 'A nice pic of my favourite lizard, Leon.',
      asset: {
        _type: 'reference',
        _ref: 'xxx',
      },
    })

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

    const parsed = parse(FileSchema, {
      _type: 'file',
      asset: {
        _type: 'reference',
        _ref: '123',
      },
      caption: 'An absolutely tip-top file for you.',
    })

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
