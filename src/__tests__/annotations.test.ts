import {describe, expect, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {enums} from '../creators/enums'
import {geopoint} from '../creators/geopoint'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {type SanityDocumentType} from '../defs'
import {getAnnotations, resolveAnnotationText} from '../helpers/annotations'
import {validateExamples} from '../helpers/validateExamples'
import {parseOrThrow} from '../parse'
import {deepPartial} from '../utils/deepPartial'
import {deepRequired} from '../utils/deepRequired'
import {extend} from '../utils/extend'
import {omit} from '../utils/omit'
import {pick} from '../utils/pick'
import {rename} from '../utils/rename'
import {shallowPartial} from '../utils/shallowPartial'
import {shallowRequired} from '../utils/shallowRequired'

describe('creators', () => {
  test('attach annotations as a plain property', () => {
    const Name = string({description: 'Display name', examples: ['Fido']})
    expect(Name).toEqual({
      typeName: 'string',
      annotations: {description: 'Display name', examples: ['Fido']},
    })
    expect(JSON.parse(JSON.stringify(Name))).toEqual(Name)
  })

  test('omit the annotations property when none is given', () => {
    expect(Object.keys(string())).toEqual(['typeName'])
    expect(Object.keys(object({name: string()}))).toEqual(['typeName', 'shape'])
  })

  test('number splits constraints from annotations', () => {
    const Rank = number({min: 1, step: 1, description: 'Sort order'})
    expect(Rank.constraints).toEqual({min: 1, step: 1})
    expect(Rank.annotations).toEqual({description: 'Sort order'})
    expect(number({description: 'x'}).constraints).toBeUndefined()
    expect(number().constraints).toBeUndefined()
  })

  test('shared constants are copied, not mutated', () => {
    const Plain = geopoint()
    const Described = geopoint({description: 'Where it happened'})
    expect(Described).not.toBe(Plain)
    expect(Plain.annotations).toBeUndefined()
    expect(Described.annotations).toEqual({description: 'Where it happened'})
    expect(Described.shape).toBe(Plain.shape)
  })

  test('annotations is accepted on every creator that can be a field', () => {
    const Person = document({_type: literal('person'), name: string()})
    const Pet = document(
      {
        _type: literal('pet', {description: 'Always "pet"'}),
        name: string({title: 'Name'}),
        species: enums(['dog', 'cat'], {description: 'Species'}),
        owner: reference(Person, {description: 'Owner'}),
        tags: array(string(), {description: 'Tags'}),
        address: object({city: string()}, {description: 'Address'}),
        contact: union(
          [object({_type: literal('email')}), object({_type: literal('anon')})],
          {description: 'Contact'},
        ),
        parent: lazy(() => reference(Person), {description: 'Parent'}),
      },
      {description: 'A pet'},
    )
    const descriptions = Object.fromEntries(
      Object.entries(Pet.shape).map(([key, field]) => [
        key,
        getAnnotations(field)?.description,
      ]),
    )
    expect(descriptions).toMatchObject({
      _type: 'Always "pet"',
      name: undefined,
      species: 'Species',
      owner: 'Owner',
      tags: 'Tags',
      address: 'Address',
      contact: 'Contact',
      parent: 'Parent',
    })
    expect(getAnnotations(Pet)).toEqual({description: 'A pet'})
  })
})

describe('getAnnotations', () => {
  test('returns undefined when nothing is attached', () => {
    expect(getAnnotations(string())).toBeUndefined()
    expect(getAnnotations(optional(string()))).toBeUndefined()
  })

  test('looks through optional and lazy, outer wins', () => {
    const inner = optional(string({description: 'inner', title: 'Inner'}))
    expect(getAnnotations(inner)).toEqual({
      description: 'inner',
      title: 'Inner',
    })

    const Outer = lazy(() => string({description: 'inner', title: 'Inner'}), {
      description: 'outer',
    })
    expect(getAnnotations(Outer)).toEqual({
      description: 'outer',
      title: 'Inner',
    })
  })

  test('resolves locale maps', () => {
    const Title = string({
      description: {en: 'The title', nb: 'Tittelen'},
      guidelines: 'Keep it short',
    })
    expect(getAnnotations(Title, {locale: 'nb'})).toEqual({
      description: 'Tittelen',
      guidelines: 'Keep it short',
    })
    expect(
      getAnnotations(Title, {locale: 'de', fallback: 'en'})?.description,
    ).toBe('The title')
    // no locale: first entry
    expect(getAnnotations(Title)?.description).toBe('The title')
  })

  test('passes examples and readOnly through untouched', () => {
    const Slug = string({examples: ['a-b'], readOnly: true, deprecated: 'old'})
    expect(getAnnotations(Slug)).toEqual({
      examples: ['a-b'],
      readOnly: true,
      deprecated: 'old',
    })
  })

  test('resolveAnnotationText', () => {
    expect(resolveAnnotationText(undefined)).toBeUndefined()
    expect(resolveAnnotationText('x')).toBe('x')
    expect(resolveAnnotationText({en: 'a', nb: 'b'}, {locale: 'nb'})).toBe('b')
    expect(resolveAnnotationText({en: 'a', nb: 'b'}, {locale: 'de'})).toBe('a')
  })
})

describe('transforms', () => {
  const Base = document(
    {
      _type: literal('base'),
      name: string({description: 'Name'}),
      age: number({description: 'Age'}),
      home: object({city: string()}, {description: 'Home'}),
      pets: array(object({_type: literal('pet')}, {description: 'Pet'}), {
        description: 'Pets',
      }),
    },
    {description: 'Base'},
  )

  test('field annotations survive every transform', () => {
    for (const next of [
      pick(Base, ['name']),
      omit(Base, ['age']),
      extend(Base, {extra: string()}),
      rename(Base, 'other'),
      shallowPartial(Base),
      deepPartial(Base),
    ]) {
      expect(getAnnotations(next.shape.name)?.description).toBe('Name')
    }
  })

  test('node annotations survive every transform', () => {
    for (const next of [
      pick(Base, ['name']),
      omit(Base, ['age']),
      extend(Base, {extra: string()}),
      rename(Base, 'other'),
      shallowPartial(Base),
      deepPartial(Base),
    ]) {
      expect(getAnnotations(next)?.description).toBe('Base')
    }
  })

  test('transforms that keep the value type keep examples', () => {
    const Doc = document(
      {_type: literal('doc'), name: string(), age: optional(number())},
      {examples: [{_type: 'doc', name: 'a'}]},
    )
    for (const next of [
      pick(Doc, ['name']),
      omit(Doc, ['age']),
      shallowPartial(Doc),
      deepPartial(Doc),
    ]) {
      expect(getAnnotations(next)?.examples).toEqual([
        {_type: 'doc', name: 'a'},
      ])
      expect(validateExamples(next).ok).toBe(true)
    }
  })

  test('transforms that change the value type drop examples', () => {
    const Doc = document(
      {
        _type: literal('doc'),
        name: string(),
        age: optional(number()),
        tags: array(object({_type: literal('tag')}), {examples: [[]]}),
      },
      {title: 'Doc', examples: [{_type: 'doc', name: 'a', tags: []}]},
    )
    for (const next of [
      extend(Doc, {owner: string()}),
      rename(Doc, 'other'),
      shallowRequired(Doc),
      deepRequired(Doc),
    ]) {
      expect(getAnnotations(next)?.title).toBe('Doc')
      expect(getAnnotations(next)?.examples).toBeUndefined()
    }
    expect(
      getAnnotations(deepRequired(Doc).shape.tags)?.examples,
    ).toBeUndefined()
    expect(getAnnotations(shallowRequired(Doc).shape.tags)?.examples).toEqual([
      [],
    ])
  })

  test('deepPartial keeps nested node annotations', () => {
    const Partial = deepPartial(Base)
    expect(getAnnotations(Partial.shape.home)?.description).toBe('Home')
    expect(getAnnotations(Partial.shape.pets)?.description).toBe('Pets')
    expect(getAnnotations(Partial.shape.pets.type.element)?.description).toBe(
      'Pet',
    )
  })

  test('array keeps element annotations except examples when adding _key', () => {
    const Pets = array(
      object(
        {_type: literal('pet')},
        {description: 'Pet', examples: [{_type: 'pet'}]},
      ),
    )
    expect(getAnnotations(Pets.element)).toEqual({description: 'Pet'})
    expect(Object.keys(Pets.element.shape)).toEqual(['_type', '_key'])
  })
})

describe('parse', () => {
  test('ignores annotations', () => {
    const Pet = document(
      {
        _type: literal('pet'),
        name: string({description: 'Name', examples: ['Fido']}),
      },
      {description: 'A pet'},
    )
    expect(parseOrThrow(Pet, {_type: 'pet', name: 'Rex'})).toEqual({
      _type: 'pet',
      name: 'Rex',
    })
  })
})

describe('recursive schemas', () => {
  test('annotations on a lazy node resolve without running the thunk early', () => {
    interface Category {
      _type: 'category'
      title: string
      parent?: {_type: 'reference'; _ref: string}
    }
    const Category: SanityDocumentType<Category> = document({
      _type: literal('category'),
      title: string(),
      parent: optional(
        lazy(() => reference(Category), {description: 'Parent category'}),
      ),
    })
    expect(getAnnotations(Category.shape.parent!)?.description).toBe(
      'Parent category',
    )
  })
})
