import {assert, describe, expect, test} from 'vitest'

import {isDocumentUnionSchema, isReferenceSchema} from '../asserters'
import {array} from '../creators/array'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {never} from '../creators/never'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {REF_SCHEMA, type Schema} from '../defs'
import {parse} from '../parse'

test('typed object union excludes never types', () => {
  const Union = union([
    object({
      _type: literal('ok'),
      name: string(),
    }),
    never(),
  ])
  const neverType = Union.union.find(schema => {
    // @ts-expect-error - should not be in type system
    return schema.typeName === 'never'
  })
  expect(neverType).toBeUndefined()
})
test('primitive union excludes never types', () => {
  const Union = union([string(), number(), never()])
  const neverType = Union.union.find(schema => {
    // @ts-expect-error - should not be in type system
    return schema.typeName === 'never'
  })
  expect(neverType).toBeUndefined()
})

describe('a union with several references', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Magazine = document({_type: literal('magazine'), title: string()})
  const Link = object({_type: literal('link'), href: string()})
  const Quote = object({_type: literal('quote'), text: string()})

  function targetsOf(schema: Schema) {
    assert(isReferenceSchema(schema))
    const targets = schema.referenceType
    assert(isDocumentUnionSchema(targets))
    return targets.union
  }

  test('combines them into one reference to a union of their targets', () => {
    const Merged = union([reference(Author), reference(Book)])
    expect(Merged.union).toHaveLength(1)
    expect(targetsOf(Merged.union[0]!)).toEqual([Author, Book])
  })

  test('puts the combined reference where the first reference was, and flattens nested unions that have references', () => {
    const Merged = union([
      Link,
      reference(Author),
      union([Quote, reference(Book)]),
    ])
    expect(Merged.union.map(member => member.typeName)).toEqual([
      'object',
      'reference',
      'object',
    ])
    expect(Merged.union[0]).toBe(Link)
    expect(Merged.union[2]).toBe(Quote)
    expect(targetsOf(Merged.union[1]!)).toEqual([Author, Book])
  })

  test('flattens unions nested more than one level deep', () => {
    const Merged = union([
      reference(Author),
      union([Quote, union([Link, reference(Book)])]),
    ])
    expect(Merged.union.map(member => member.typeName)).toEqual([
      'reference',
      'object',
      'object',
    ])
    expect(targetsOf(Merged.union[0]!)).toEqual([Author, Book])
  })

  test('keeps nested unions without references', () => {
    const Nested = union([Link, Quote])
    const Merged = union([reference(Author), Nested, reference(Book)])
    expect(Merged.union[1]).toBe(Nested)
  })

  test('includes the members of a reference to a union, once each', () => {
    const Merged = union([
      reference(union([Author, Book])),
      reference(Magazine),
      reference(Author),
    ])
    expect(targetsOf(Merged.union[0]!)).toEqual([Author, Book, Magazine])
  })

  test('keeps lazy targets lazy', () => {
    const LazyBook = lazy(() => Book)
    const Merged = union([reference(Author), reference(LazyBook)])
    expect(targetsOf(Merged.union[0]!)).toEqual([Author, LazyBook])
  })

  test('throws for targets with the same _type', () => {
    const OtherAuthor = document({_type: literal('author'), fullName: string()})
    expect(() => union([reference(Author), reference(OtherAuthor)])).toThrow(
      'more than one has _type "author"',
    )
  })

  test('throws when a reference or a nested union with one has annotations', () => {
    const message =
      'union() combines several reference() members into one reference, so they, the unions they point to, and any nested union() that contains them cannot have annotations. Annotate a single reference(union([...])) instead'
    expect(() =>
      union([reference(Author, {title: 'Author'}), reference(Book)]),
    ).toThrow(message)
    expect(() =>
      union([reference(Author), union([reference(Book)], {title: 'Books'})]),
    ).toThrow(message)
    expect(() =>
      union([
        reference(union([Author, Book], {title: 'Subjects'})),
        reference(Magazine),
      ]),
    ).toThrow(message)
  })

  test('parses like a reference to a union', () => {
    const Merged = union([reference(Author), reference(Book), Link])
    const result = parse(Merged, {_type: 'reference', _ref: 'cosmos'})
    assert(result.ok)
    assert(result.value._type === 'reference')
    expect(targetsOfSchema(result.value[REF_SCHEMA])).toEqual([Author, Book])
  })
})

test('a union of documents parses each document against its own schema', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Docs = union([Author, lazy(() => Book)])
  const book = parse(Docs, {_type: 'book', _id: 'cosmos', title: 'Cosmos'})
  assert(book.ok)
  expect(book.value).toEqual({_type: 'book', _id: 'cosmos', title: 'Cosmos'})
  const invalid = parse(Docs, {_type: 'author', _id: 'carl'})
  assert(!invalid.ok)
  expect(invalid.error.issues.map(issue => issue.path)).toContainEqual(['name'])
})

function targetsOfSchema(schema: Schema) {
  assert(isDocumentUnionSchema(schema))
  return schema.union
}

test('a union of documents is a document union, and cannot include other object types', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Link = object({_type: literal('link'), href: string()})
  expect(union([Author, lazy(() => Book), never()]).typeName).toBe(
    'documentUnion',
  )
  expect(() => union([Author, Link] as any)).toThrow(
    'union() members cannot mix documents and other object types',
  )
})

test('a union of documents parses nested unions of documents', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Book = document({_type: literal('book'), title: string()})
  const Docs = union([Author, union([Book])])
  const book = parse(Docs, {_type: 'book', title: 'Cosmos'})
  assert(book.ok)
  expect(book.value).toEqual({_type: 'book', title: 'Cosmos'})
})

test('lazy members that are not documents cannot be mixed with object types', () => {
  const Link = object({_type: literal('link'), href: string()})
  const Quote = object({_type: literal('quote'), text: string()})
  expect(() => union([lazy(() => Link), Quote] as any)).toThrow(
    'union() members cannot mix documents and other object types (lazy() members must be documents)',
  )
})

test('array() throws for a union of documents', () => {
  const Author = document({_type: literal('author'), name: string()})
  expect(() => array(union([Author]) as any)).toThrow(
    'array() elements cannot be a union() of documents',
  )
})
