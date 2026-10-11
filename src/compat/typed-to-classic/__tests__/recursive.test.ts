import {describe, expect, test} from 'vitest'

import {array} from '../../../creators/array'
import {document} from '../../../creators/document'
import {lazy} from '../../../creators/lazy'
import {literal} from '../../../creators/literal'
import {object} from '../../../creators/object'
import {optional} from '../../../creators/optional'
import {reference} from '../../../creators/reference'
import {string} from '../../../creators/string'
import {union} from '../../../creators/union'
import {type SanityAny, type SanityObjectType} from '../../../defs'
import {deepPartial} from '../../../utils/deepPartial'
import {toClassicSchema} from '../toClassicSchema'

describe('recursive schemas', () => {
  test('self-reference through an array', () => {
    const Node = object({
      _type: literal('node'),
      label: string(),
      get children() {
        return array(Node)
      },
    })
    const Tree = document({_type: literal('tree'), root: Node})

    expect(toClassicSchema(Tree)).toEqual([
      {
        type: 'document',
        name: 'tree',
        fields: [{name: 'root', type: 'node'}],
      },
      {
        type: 'object',
        name: 'node',
        fields: [
          {name: 'label', type: 'string'},
          {name: 'children', type: 'array', of: [{type: 'node'}]},
        ],
      },
    ])
  })

  test('self-reference through `optional()`', () => {
    const Item = object({
      _type: literal('item'),
      value: string(),
      get next() {
        return optional(Item)
      },
    })
    const List = document({_type: literal('list'), items: array(Item)})

    expect(toClassicSchema(List)).toEqual([
      {
        type: 'document',
        name: 'list',
        fields: [{name: 'items', type: 'array', of: [{type: 'item'}]}],
      },
      {
        type: 'object',
        name: 'item',
        fields: [
          {name: 'value', type: 'string'},
          {name: 'next', type: 'item'},
        ],
      },
    ])
  })

  test('self-reference through a reference', () => {
    const Person = document({
      _type: literal('person'),
      name: string(),
      get friends() {
        return array(reference(Person))
      },
      get best() {
        return optional(reference(Person))
      },
    })

    expect(toClassicSchema(Person)).toEqual([
      {
        type: 'document',
        name: 'person',
        fields: [
          {name: 'name', type: 'string'},
          {
            name: 'friends',
            type: 'array',
            of: [{type: 'reference', to: {type: 'person'}}],
          },
          {name: 'best', type: 'reference', to: {type: 'person'}},
        ],
      },
    ])
  })

  test('mutual recursion between two objects', () => {
    const Section = object({
      _type: literal('section'),
      title: string(),
      get subsections() {
        return array(Subsection)
      },
    })
    const Subsection = object({
      _type: literal('subsection'),
      heading: string(),
      get parent() {
        return optional(Section)
      },
    })
    const Article = document({
      _type: literal('article'),
      body: Section,
    })

    expect(toClassicSchema(Article)).toEqual([
      {
        type: 'document',
        name: 'article',
        fields: [{name: 'body', type: 'section'}],
      },
      {
        type: 'object',
        name: 'subsection',
        fields: [
          {name: 'heading', type: 'string'},
          {name: 'parent', type: 'section'},
        ],
      },
      {
        type: 'object',
        name: 'section',
        fields: [
          {name: 'title', type: 'string'},
          {name: 'subsections', type: 'array', of: [{type: 'subsection'}]},
        ],
      },
    ])
  })

  test('a hoisted type is emitted once and referred to by name everywhere', () => {
    const Node = object({
      _type: literal('node'),
      get children() {
        return array(Node)
      },
    })
    const Tree = document({
      _type: literal('tree'),
      root: Node,
      others: array(Node),
    })

    const types = toClassicSchema(Tree)
    expect(types.map(type => type.name)).toEqual(['tree', 'node'])
    expect(types[0]).toEqual({
      type: 'document',
      name: 'tree',
      fields: [
        {name: 'root', type: 'node'},
        {name: 'others', type: 'array', of: [{type: 'node'}]},
      ],
    })
  })

  test('non-recursive fields declared with getters or lazy() are inlined', () => {
    const Address = object({street: string()})
    const Place = document({
      _type: literal('place'),
      get address() {
        return Address
      },
      tags: lazy((): SanityAny => array(string())),
    })

    expect(toClassicSchema(Place)).toEqual([
      {
        type: 'document',
        name: 'place',
        fields: [
          {
            name: 'address',
            type: 'object',
            fields: [{name: 'street', type: 'string'}],
          },
          {name: 'tags', type: 'array', of: [{type: 'string'}]},
        ],
      },
    ])
  })

  test('self-reference through `lazy()`', () => {
    interface Node {
      _type: 'node'
      label: string
      children: Node[]
    }
    const Node: SanityObjectType<Node> = object({
      _type: literal('node'),
      label: string(),
      children: lazy(() => array(Node)),
    })
    const Tree = document({_type: literal('tree'), root: Node})

    expect(toClassicSchema(Tree)).toEqual([
      {
        type: 'document',
        name: 'tree',
        fields: [{name: 'root', type: 'node'}],
      },
      {
        type: 'object',
        name: 'node',
        fields: [
          {name: 'label', type: 'string'},
          {name: 'children', type: 'array', of: [{type: 'node'}]},
        ],
      },
    ])
  })

  test('self-reference through an object union in an array', () => {
    const Leaf = object({_type: literal('leaf'), value: string()})
    const Branch = object({
      _type: literal('branch'),
      get children() {
        return array(union([Branch, Leaf]))
      },
    })
    const Tree = document({_type: literal('tree'), root: Branch})

    expect(toClassicSchema(Tree)).toEqual([
      {
        type: 'document',
        name: 'tree',
        fields: [{name: 'root', type: 'branch'}],
      },
      {
        type: 'object',
        name: 'branch',
        fields: [
          {
            name: 'children',
            type: 'array',
            of: [
              {type: 'branch'},
              {
                type: 'object',
                name: 'leaf',
                fields: [{name: 'value', type: 'string'}],
              },
            ],
          },
        ],
      },
    ])
  })

  test('recursive schema passed through `deepPartial()`', () => {
    // `deepPartial` resolves getter fields to a new schema object each time,
    // so the cycle has to be detected by `_type` name
    const Node = object({
      _type: literal('node'),
      label: string(),
      get children() {
        return array(Node)
      },
    })
    const Tree = document({
      _type: literal('tree'),
      root: Node,
      others: array(Node),
    })

    expect(toClassicSchema(deepPartial(Tree))).toEqual([
      {
        type: 'document',
        name: 'tree',
        fields: [
          {name: 'root', type: 'node'},
          {name: 'others', type: 'array', of: [{type: 'node'}]},
        ],
      },
      {
        type: 'object',
        name: 'node',
        fields: [
          {name: 'label', type: 'string'},
          {name: 'children', type: 'array', of: [{type: 'node'}]},
        ],
      },
    ])
  })

  test('a cycle entered at an untyped object is closed at the typed object in it', () => {
    const Wrapper = object({
      get a() {
        return optional(A)
      },
    })
    const A = object({
      _type: literal('a'),
      get wrapper() {
        return optional(Wrapper)
      },
    })
    const Doc = document({_type: literal('doc'), root: Wrapper})

    expect(toClassicSchema(Doc)).toEqual([
      {
        type: 'document',
        name: 'doc',
        fields: [
          {
            name: 'root',
            type: 'object',
            fields: [{name: 'a', type: 'a'}],
          },
        ],
      },
      {
        type: 'object',
        name: 'a',
        fields: [
          {
            name: 'wrapper',
            type: 'object',
            fields: [{name: 'a', type: 'a'}],
          },
        ],
      },
    ])
  })

  test('throws on two different recursive object types with the same `_type`', () => {
    const N1 = object({
      _type: literal('node'),
      x: string(),
      get children() {
        return array(N1)
      },
    })
    const N2 = object({
      _type: literal('node'),
      y: string(),
      get children() {
        return array(N2)
      },
    })
    const Doc = document({_type: literal('doc'), a: N1, b: N2})

    expect(() => toClassicSchema(Doc)).toThrow(
      /two different recursive object types have the `_type` "node"/,
    )
  })

  test('throws on a type nested in a different type with the same `_type`', () => {
    const Inner = object({_type: literal('node'), y: string()})
    const Outer = object({
      _type: literal('node'),
      x: string(),
      child: optional(Inner),
    })
    const Doc = document({_type: literal('doc'), root: Outer})

    expect(() => toClassicSchema(Doc)).toThrow(
      /two different object types have the `_type` "node"/,
    )
  })

  test('throws on a recursive object without a `_type` literal', () => {
    const Node = object({
      get child() {
        return optional(Node)
      },
    })
    const Tree = document({_type: literal('tree'), root: Node})

    expect(() => toClassicSchema(Tree)).toThrow(/needs a `_type` literal/)
  })

  test('throws on a recursive object without a `_type` literal passed through `deepPartial()`', () => {
    const Node = object({
      get child() {
        return optional(Node)
      },
    })
    const Tree = deepPartial(document({_type: literal('tree'), root: Node}))

    expect(() => toClassicSchema(Tree)).toThrow(/needs a `_type` literal/)
  })
})
