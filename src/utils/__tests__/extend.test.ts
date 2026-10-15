import {assert, assertType, describe, expect, test} from 'vitest'

import {array} from '../../creators/array'
import {block} from '../../creators/block'
import {boolean} from '../../creators/boolean'
import {document} from '../../creators/document'
import {file} from '../../creators/file'
import {image} from '../../creators/image'
import {lazy} from '../../creators/lazy'
import {literal} from '../../creators/literal'
import {never} from '../../creators/never'
import {number} from '../../creators/number'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {reference} from '../../creators/reference'
import {string} from '../../creators/string'
import {union} from '../../creators/union'
import {type ObjectSchemaOf, type Schema} from '../../defs'
import {getAnnotations} from '../../helpers/annotations'
import {defineType} from '../../helpers/defineType'
import {parse} from '../../parse'
import {extend} from '../extend'

describe('extends helper', () => {
  test('simple extends', () => {
    const obj = object({str: string(), num: number()})
    const extended = extend(obj, {extendedStr: string(), extendedNum: number()})

    const parsedResult = parse(extended, {
      str: 'foo',
      num: 1,
      extendedStr: 'bar',
      extendedNum: 1,
    })
    assert(parsedResult.ok)
    const parsed = parsedResult.value

    assertType<{
      str: string
      num: number
      extendedStr: string
      extendedNum: number
    }>(parsed)

    assertType<{
      str: string
      num: string
      extendedStr: string
      extendedNum: number
    }>(
      //@ts-expect-error num should be number
      parsed,
    )
  })

  test('extends w/override', () => {
    const obj = object({
      changedFromStringToLiteralString: string(),
      changedFromNumberToString: number(),
    })

    const extended = extend(obj, {
      changedFromStringToLiteralString: literal('literally this'),
      changedFromNumberToString: string(),
    })

    const parsedResult = parse(extended, {
      changedFromStringToLiteralString: 'literally this',
      changedFromNumberToString: 'a string',
    })
    assert(parsedResult.ok)
    const parsed = parsedResult.value

    assertType<'literally this'>(parsed.changedFromStringToLiteralString)
    assertType<{
      changedFromStringToLiteralString: 'literally this'
      changedFromNumberToString: string
    }>(parsed)

    assertType<string>(parsed.changedFromNumberToString)

    // @ts-expect-error extended type has been refined to literal and is no longer compatible with string
    assertType<typeof parsed.changedFromStringToLiteralString>('' as string)

    // @ts-expect-error extended type has been changed from number to string
    assertType<number>(parsed.changedFromNumberToString)
  })

  test('extends of circular type', () => {
    interface Person {
      _type: 'person'
      name: string
      parent: Omit<Person, 'parent'> & {foo: string; parent?: Person}
    }

    const LazyPerson: ObjectSchemaOf<Person> = object({
      _type: literal('person'),
      name: lazy(() => string()),
      parent: lazy(() =>
        extend(LazyPerson, {
          foo: string(),
          parent: optional(LazyPerson),
        }),
      ),
    })

    const parsedResult = parse(LazyPerson, {
      _type: 'person',
      name: 'foo',
      parent: {
        _type: 'person',
        name: 'parent',
        foo: 'ok',
      },
    })
    assert(parsedResult.ok)
    const parsed = parsedResult.value
    expect(parsed).toEqual({
      _type: 'person',
      name: 'foo',
      parent: {
        _type: 'person',
        foo: 'ok',
        name: 'parent',
      },
    })
  })
  test('inline extends', () => {
    const Pet = object({name: string()})

    const u = union([
      extend(Pet, {
        _type: literal('avine'),
        squeaks: boolean(),
      }),
      extend(Pet, {
        _type: literal('feline'),
        meows: boolean(),
      }),
      extend(Pet, {
        _type: literal('canine'),
        barks: boolean(),
      }),
    ])

    const _human = document({
      _type: literal('human'),
      name: string(),
      address: object({
        street: string(),
        city: string(),
        country: string(),
      }),

      pets: array(u),
    })
  })
})

describe('extend on a union', () => {
  const Hero = object({_type: literal('hero'), title: string()})
  const Gallery = object({_type: literal('gallery'), images: number()})
  const Section = union([Hero, Gallery])

  test('adds the fields to every member', () => {
    const Extended = extend(Section, {anchor: optional(string())})
    expect(Extended.typeName).toBe('union')
    expect(Extended.union.map(member => Object.keys(member.shape))).toEqual([
      ['_type', 'title', 'anchor'],
      ['_type', 'images', 'anchor'],
    ])
    expect(Extended.union[0]!.shape).toMatchObject({
      _type: {typeName: 'literal', value: 'hero'},
      anchor: {typeName: 'optional'},
    })
  })

  test('parses values of every member, with the new fields', () => {
    const Extended = extend(Section, {anchor: string()})
    const hero = parse(Extended, {
      _type: 'hero',
      title: 'Welcome',
      anchor: 'top',
    })
    assert(hero.ok)
    expect(hero.value).toEqual({_type: 'hero', title: 'Welcome', anchor: 'top'})
    const gallery = parse(Extended, {
      _type: 'gallery',
      images: 3,
      anchor: 'photos',
    })
    assert(gallery.ok)
    expect(gallery.value).toEqual({
      _type: 'gallery',
      images: 3,
      anchor: 'photos',
    })
    const missing = parse(Extended, {_type: 'gallery', images: 3})
    expect(missing.ok).toBe(false)
    const unknown = parse(Extended, {_type: 'quote', anchor: 'q'})
    expect(unknown.ok).toBe(false)
  })

  test('keeps the _type literals of the members', () => {
    const Extended = extend(Section, {anchor: string()})
    expect(Extended.union.map(member => member.shape._type)).toEqual([
      literal('hero'),
      literal('gallery'),
    ])
  })

  test('replaces fields on the members that have them', () => {
    const Extended = extend(Section, {title: number()})
    expect(Extended.union[0]!.shape.title).toEqual(number())
    expect(Extended.union[1]!.shape.title).toEqual(number())
    const result = parse(Extended, {_type: 'hero', title: 1})
    assert(result.ok)
    expect(result.value).toEqual({_type: 'hero', title: 1})
  })

  test('works in an array', () => {
    const Page = document({
      _type: literal('page'),
      sections: array(extend(Section, {anchor: optional(string())})),
    })
    const result = parse(Page, {
      _type: 'page',
      sections: [
        {_type: 'hero', _key: 'a', title: 'Welcome'},
        {_type: 'gallery', _key: 'b', images: 2, anchor: 'photos'},
      ],
    })
    assert(result.ok)
    expect(result.value.sections[1]).toEqual({
      _type: 'gallery',
      _key: 'b',
      images: 2,
      anchor: 'photos',
    })
  })

  test('returns a new schema and leaves the source alone', () => {
    const Extended = extend(Section, {anchor: string()})
    expect(Extended).not.toBe(Section)
    expect(Section.union[0]!.shape).not.toHaveProperty('anchor')
    expect(Hero.shape).not.toHaveProperty('anchor')
  })

  test('keeps the output and ~standard properties', () => {
    const Extended = extend(Section, {anchor: string()})
    expect(Object.keys(Extended)).toEqual(['typeName', 'union'])
    expect(Extended['~standard'].vendor).toBe('@sanity-labs/typed-schema')
    expect(
      Extended['~standard'].validate({_type: 'hero', title: 'x', anchor: 'a'}),
    ).toEqual({value: {_type: 'hero', title: 'x', anchor: 'a'}})
  })

  test('keeps the annotations of the union and its members, except examples', () => {
    const Annotated = union(
      [
        object(
          {_type: literal('hero'), title: string()},
          {title: 'Hero', examples: [{_type: 'hero', title: 'Welcome'}]},
        ),
        Gallery,
      ],
      {title: 'Section', examples: [{_type: 'hero', title: 'Welcome'}]},
    )
    const Extended = extend(Annotated, {anchor: string()})
    expect(getAnnotations(Extended)).toEqual({title: 'Section'})
    expect(getAnnotations(Extended.union[0]!)).toEqual({title: 'Hero'})
    expect(getAnnotations(Extended.union[1]!)).toBeUndefined()
  })

  test('keeps a never() member as is', () => {
    // `union()` leaves `never()` out, so build the union by hand
    const Never = never()
    const WithNever = defineType({typeName: 'union', union: [Hero, Never]})
    const Extended = extend(WithNever as typeof Section, {anchor: string()})
    expect(Extended.union[1]).toBe(Never)
    expect(Extended.union[0]!.shape).toHaveProperty('anchor')
  })

  test('throws when the fields replace _type', () => {
    const fields: Record<string, Schema> = {_type: literal('section')}
    expect(() => extend(Section, fields)).toThrow(
      'extend() cannot replace _type on a union(): its members are told apart by their _type literals',
    )
    // on a single object _type can be replaced
    expect(extend(Hero, fields).shape._type).toEqual(literal('section'))
  })

  test('extends the members of a nested union', () => {
    const Nested = union([Hero, union([Gallery])])
    const Extended = extend(Nested, {anchor: string()})
    const result = parse(Extended, {_type: 'gallery', images: 1, anchor: 'g'})
    assert(result.ok)
    expect(result.value).toEqual({_type: 'gallery', images: 1, anchor: 'g'})
  })

  test('resolves getter fields lazily on every member', () => {
    const Extended = extend(Section, {
      get next() {
        return optional(Extended)
      },
    })
    const result = parse(Extended, {
      _type: 'hero',
      title: 'a',
      next: {_type: 'gallery', images: 1, next: {_type: 'hero', title: 'b'}},
    })
    assert(result.ok)
    expect(result.value).toEqual({
      _type: 'hero',
      title: 'a',
      next: {_type: 'gallery', images: 1, next: {_type: 'hero', title: 'b'}},
    })
  })

  test('throws on members that are not objects', () => {
    const Author = document({_type: literal('author'), name: string()})
    const message = /extend\(\) can only extend a union\(\) of objects/
    const WithReference = union([Hero, reference(Author)])
    const WithBlock = union([Hero, block({})])
    const WithImage = union([Hero, image()])
    const WithFile = union([Hero, file()])
    // @ts-expect-error - a reference has a fixed shape
    expect(() => extend(WithReference, {anchor: string()})).toThrow(message)
    // @ts-expect-error - a block has a fixed shape
    expect(() => extend(WithBlock, {anchor: string()})).toThrow(message)
    // @ts-expect-error - an image has a fixed shape
    expect(() => extend(WithImage, {anchor: string()})).toThrow(message)
    // @ts-expect-error - a file has a fixed shape
    expect(() => extend(WithFile, {anchor: string()})).toThrow(message)
  })
})
