import {assert, expectTypeOf, test} from 'vitest'

import {document} from '../../creators/document'
import {lazy} from '../../creators/lazy'
import {literal} from '../../creators/literal'
import {optional} from '../../creators/optional'
import {reference} from '../../creators/reference'
import {string} from '../../creators/string'
import {union} from '../../creators/union'
import {type DocumentSchemaOf, type Infer, type Parsed} from '../../defs'
import {type Committed} from '../../lifecycle'
import {parse} from '../../parse'
import {
  type DocumentBase,
  type DocumentValue,
  type ReferenceValue,
} from '../../shapeDefs'
import {createLoader} from '../createLoader'
import {
  createReferenceLoader,
  type LoadedReference,
  type ReferencedSchema,
} from '../createReferenceLoader'

const Country = document({_type: literal('country'), name: string()})

const Person = document({
  _type: literal('person'),
  name: string(),
  country: reference(Country),
  birthplace: reference(lazy(() => Country)),
})

const personResult = parse(Person, {
  _type: 'person',
  name: 'Carl',
  country: {_type: 'reference', _ref: 'usa'},
  birthplace: {_type: 'reference', _ref: 'usa'},
})
assert(personResult.ok)
const person = personResult.value

const fetch = () => Promise.resolve(undefined)

test('a parsed reference value carries its target schema', () => {
  expectTypeOf<ReferencedSchema<typeof person.country>>().toEqualTypeOf<
    typeof Country
  >()
  expectTypeOf<LoadedReference<typeof person.country>>().toEqualTypeOf<
    Parsed<Committed<typeof Country>>
  >()
})

test('loadReference resolves to the committed target document', async () => {
  const loadReference = createReferenceLoader(fetch)
  const country = await loadReference(person.country)
  expectTypeOf(country).toEqualTypeOf<Parsed<Committed<typeof Country>>>()
  expectTypeOf(country).toEqualTypeOf<{
    _type: 'country'
    _id: string
    _rev: string
    _createdAt: string
    _updatedAt: string
    name: string
  }>()
})

test('loadReference resolves lazy targets', async () => {
  const loadReference = createReferenceLoader(fetch)
  const birthplace = await loadReference(person.birthplace)
  expectTypeOf(birthplace).toEqualTypeOf<Parsed<Committed<typeof Country>>>()
})

test('an Infer reference falls back to the committed base document', async () => {
  const loadReference = createReferenceLoader(fetch)
  const plain: Infer<typeof Person> = {
    _type: 'person',
    name: 'Carl',
    country: {_type: 'reference', _ref: 'usa'},
    birthplace: {_type: 'reference', _ref: 'usa'},
  }
  const country = await loadReference(plain.country)
  expectTypeOf(country).toEqualTypeOf<Parsed<Committed<typeof DocumentBase>>>()
  expectTypeOf(country).not.toHaveProperty('name')
  const unknown = await loadReference({_type: 'reference', _ref: 'usa'})
  expectTypeOf(unknown).toEqualTypeOf<Parsed<Committed<typeof DocumentBase>>>()
  expectTypeOf(unknown).toEqualTypeOf<{
    _type: string
    _id: string
    _rev: string
    _createdAt: string
    _updatedAt: string
  }>()
})

test('createLoader types every helper', async () => {
  const {loadDocument, loadDocuments, loadReference, loadReferences} =
    createLoader(fetch)
  expectTypeOf(await loadDocument(Country, 'usa')).toEqualTypeOf<
    Parsed<Committed<typeof Country>>
  >()
  expectTypeOf(await loadDocuments(Country, ['usa'])).toEqualTypeOf<
    Parsed<Committed<typeof Country>>[]
  >()
  expectTypeOf(await loadReference(person.country)).toEqualTypeOf<
    Parsed<Committed<typeof Country>>
  >()
  expectTypeOf(await loadReferences([person.country])).toEqualTypeOf<
    Parsed<Committed<typeof Country>>[]
  >()
})

test('loadReference stays typed for a recursive schema annotated with ReferenceValue', async () => {
  interface TreeNode extends DocumentValue {
    name: string
    parent?: ReferenceValue<TreeNode>
  }
  const TreeNode: DocumentSchemaOf<TreeNode> = document({
    _type: literal('node'),
    name: string(),
    parent: optional(lazy(() => reference(TreeNode))),
  })
  const loadReference = createReferenceLoader(fetch)
  const childResult = parse(TreeNode, {
    _type: 'node',
    name: 'child',
    parent: {_type: 'reference', _ref: 'root'},
  })
  assert(childResult.ok)
  const child = childResult.value
  const parent = await loadReference(child.parent!)
  expectTypeOf(parent).toEqualTypeOf<Parsed<Committed<typeof TreeNode>>>()
  expectTypeOf(parent).toEqualTypeOf<{
    _type: string
    _id: string
    _rev: string
    _createdAt: string
    _updatedAt: string
    name: string
    parent?: ReferenceValue<TreeNode>
  }>()
})

test('loadReference resolves a reference to a union of documents to a union', async () => {
  const Author = document({_type: literal('author'), name: string()})
  const Review = document({
    _type: literal('review'),
    subject: reference(union([Author, lazy(() => Country)])),
  })
  const reviewResult = parse(Review, {})
  assert(reviewResult.ok)
  const {subject} = reviewResult.value
  expectTypeOf<ReferencedSchema<typeof subject>>().toEqualTypeOf<
    typeof Author | ReturnType<typeof lazy<typeof Country>>
  >()

  const loadReference = createReferenceLoader(fetch)
  const loaded = await loadReference(subject)
  expectTypeOf(loaded).toEqualTypeOf<
    Parsed<Committed<typeof Author>> | Parsed<Committed<typeof Country>>
  >()
  if (loaded._type === 'author') {
    expectTypeOf(loaded.name).toEqualTypeOf<string>()
  }
})

test('loadReference resolves a union of references like a reference to a union', async () => {
  const Author = document({_type: literal('author'), name: string()})
  const Review = document({
    _type: literal('review'),
    subject: union([reference(Author), reference(lazy(() => Country))]),
  })
  const reviewResult = parse(Review, {})
  assert(reviewResult.ok)
  const {subject} = reviewResult.value
  const loaded = await createReferenceLoader(fetch)(subject)
  expectTypeOf(loaded).toEqualTypeOf<
    Parsed<Committed<typeof Author>> | Parsed<Committed<typeof Country>>
  >()
})
