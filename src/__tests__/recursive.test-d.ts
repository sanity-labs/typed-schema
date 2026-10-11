import {assertType, expectTypeOf, test} from 'vitest'

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
import {type Infer, type Parsed} from '../defs'
import {deepPartial} from '../utils/deepPartial'
import {extend} from '../utils/extend'
import {required} from '../utils/required'
import {type ShallowRequired} from '../utils/shallowRequired'

// Recursive schemas declared with getters infer without annotations. The
// assertions below plant errors several levels deep, because a recursive type
// that collapsed to `any` would accept everything and pass a positive check.

const Category = object({
  _type: literal('category'),
  name: string(),
  get subcategories() {
    return array(Category)
  },
})
type Category = Infer<typeof Category>

test('self-reference through an array', () => {
  expectTypeOf<Category['name']>().toEqualTypeOf<string>()
  expectTypeOf<
    Category['subcategories'][number]['subcategories'][number]['name']
  >().toEqualTypeOf<string>()

  expectTypeOf<
    Infer<(typeof Category)['shape']['subcategories']['element']>['_key']
  >().toEqualTypeOf<string>()

  assertType<Category>({
    _type: 'category',
    name: 'a',
    subcategories: [
      {_type: 'category', _key: 'k', name: 'b', subcategories: []},
    ],
  })
  assertType<Category>({
    _type: 'category',
    name: 'a',
    subcategories: [
      // @ts-expect-error - name must be a string at depth 2
      {_type: 'category', _key: 'k', name: 1, subcategories: []},
    ],
  })
})

const Node = object({
  _type: literal('node'),
  value: string(),
  get next() {
    return optional(Node)
  },
})
type Node = Infer<typeof Node>

test('self-reference through optional', () => {
  expectTypeOf<keyof Node>().toEqualTypeOf<'_type' | 'value' | 'next'>()
  assertType<Node>({_type: 'node', value: 'a'})
  assertType<Node>({
    _type: 'node',
    value: 'a',
    next: {_type: 'node', value: 'b', next: {_type: 'node', value: 'c'}},
  })
  assertType<Node>({
    _type: 'node',
    value: 'a',
    // @ts-expect-error - value must be a string at depth 3
    next: {_type: 'node', value: 'b', next: {_type: 'node', value: 3}},
  })
})

const User = object({
  _type: literal('user'),
  name: string(),
  get posts() {
    return array(Post)
  },
})
const Post = object({
  _type: literal('post'),
  title: string(),
  get author() {
    return User
  },
})
type User = Infer<typeof User>

test('mutual recursion', () => {
  expectTypeOf<
    User['posts'][number]['author']['posts'][number]['title']
  >().toEqualTypeOf<string>()
  assertType<User>({
    _type: 'user',
    name: 'u',
    posts: [
      {
        _type: 'post',
        _key: 'k',
        title: 't',
        // @ts-expect-error - wrong _type at depth 3
        author: {_type: 'post', name: 'u2', posts: []},
      },
    ],
  })
})

const Person = document({
  _type: literal('person'),
  name: string(),
  get friends() {
    return array(reference(Person))
  },
})
type Person = Infer<typeof Person>

test('document referencing itself', () => {
  type Friend = Person['friends'][number]
  expectTypeOf<Friend['_ref']>().toEqualTypeOf<string>()
  type FriendSchema = Parsed<typeof Person>['friends'][number]['$refSchema']
  expectTypeOf<Infer<FriendSchema>['name']>().toEqualTypeOf<string>()
  expectTypeOf<
    Infer<FriendSchema>['friends'][number]['_ref']
  >().toEqualTypeOf<string>()
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
type Folder = Infer<typeof Folder>

test('self-reference through a union', () => {
  type Child = Folder['children'][number]
  expectTypeOf<Child['_type']>().toEqualTypeOf<'file' | 'folder'>()
  type SubFolder = Extract<Child, {_type: 'folder'}>
  expectTypeOf<SubFolder['children'][number]['name']>().toEqualTypeOf<string>()
})

const Tree = extend(object({_type: literal('tree'), name: string()}), {
  get parent() {
    return optional(Tree)
  },
})
type Tree = Infer<typeof Tree>

test('self-reference added with extend', () => {
  expectTypeOf<keyof Tree>().toEqualTypeOf<'_type' | 'name' | 'parent'>()
  assertType<Tree>({
    _type: 'tree',
    name: 'a',
    // @ts-expect-error - name must be a string at depth 2
    parent: {_type: 'tree', name: 2},
  })
})

test('deepPartial applies at every depth', () => {
  const PartialCategory = deepPartial(Category)
  type PartialCategory = Infer<typeof PartialCategory>
  assertType<PartialCategory>({_type: 'category'})
  assertType<PartialCategory>({
    _type: 'category',
    subcategories: [{_type: 'category', _key: 'k'}],
  })
  assertType<PartialCategory>({
    _type: 'category',
    // @ts-expect-error - name must be a string at depth 2
    subcategories: [{_type: 'category', _key: 'k', name: 1}],
  })
})

test('shallowRequired unwraps optional getter fields', () => {
  type RequiredNode = Infer<ShallowRequired<typeof Node>>
  expectTypeOf<RequiredNode['next']>().not.toEqualTypeOf<undefined>()
  // @ts-expect-error - next is required
  assertType<RequiredNode>({_type: 'node', value: 'a'})
})

test('required unwraps optional inside lazy', () => {
  const RequiredString = required(lazy(() => optional(string())))
  expectTypeOf<Infer<typeof RequiredString>>().toEqualTypeOf<string>()
  const Obj = object({
    _type: literal('obj'),
    name: required(lazy(() => optional(string()))),
  })
  // @ts-expect-error - name is required
  assertType<Infer<typeof Obj>>({_type: 'obj'})
})

test('field names are still validated', () => {
  object({
    _type: literal('x'),
    // @ts-expect-error - fields starting with `_` are reserved
    _custom: string(),
    get valid() {
      return string()
    },
  })
})

const Gallery = object({
  _type: literal('gallery'),
  title: string(),
  cover: image({
    get related() {
      return array(Gallery)
    },
  }),
  attachment: file({
    get gallery() {
      return optional(Gallery)
    },
  }),
})
type Gallery = Infer<typeof Gallery>

test('self-reference inside image and file fields', () => {
  expectTypeOf<
    Gallery['cover']['related'][number]['title']
  >().toEqualTypeOf<string>()
  expectTypeOf<
    NonNullable<
      Gallery['attachment']['gallery']
    >['cover']['related'][number]['title']
  >().toEqualTypeOf<string>()
})

const Page = object({
  _type: literal('page'),
  title: string(),
  meta: object({
    get parent() {
      return optional(Page)
    },
  }),
})
type Page = Infer<typeof Page>

test('self-reference inside a nested object field', () => {
  expectTypeOf<
    NonNullable<NonNullable<Page['meta']['parent']>['meta']['parent']>['title']
  >().toEqualTypeOf<string>()
  assertType<Page>({
    _type: 'page',
    title: 'a',
    meta: {
      parent: {
        _type: 'page',
        // @ts-expect-error - title is a string
        title: 1,
        meta: {},
      },
    },
  })
})
