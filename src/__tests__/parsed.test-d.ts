import {assert, describe, expectTypeOf, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {
  type Infer,
  type Parsed,
  type SanityDocumentType,
  type SanityType,
} from '../defs'
import {type Format} from '../helpers/utilTypes'
import {parse, parseOrThrow, type ParseError} from '../parse'
import {
  type SanityArrayValue,
  type SanityDocumentValue,
  type SanityReferenceValue,
} from '../shapeDefs'

const Person = document({_type: literal('person'), name: string()})
type PersonRef = {_type: 'reference'; _ref: string; _weak?: boolean}
type ParsedPersonRef = Format<PersonRef & {$refSchema: typeof Person}>

describe('Infer strips $refSchema, Parsed keeps it', () => {
  test('top-level reference', () => {
    const Ref = reference(Person)
    expectTypeOf<Infer<typeof Ref>>().toEqualTypeOf<PersonRef>()
    expectTypeOf<Parsed<typeof Ref>>().toEqualTypeOf<ParsedPersonRef>()
    expectTypeOf<Parsed<typeof Ref>['$refSchema']>().toEqualTypeOf<
      typeof Person
    >()
  })

  test('nested object', () => {
    const Pet = document({
      _type: literal('pet'),
      details: object({owner: reference(Person)}),
    })
    expectTypeOf<
      Infer<typeof Pet>['details']['owner']
    >().toEqualTypeOf<PersonRef>()
    expectTypeOf<
      Parsed<typeof Pet>['details']['owner']
    >().toEqualTypeOf<ParsedPersonRef>()
  })

  test('array item', () => {
    const Owners = array(reference(Person))
    expectTypeOf<Infer<typeof Owners>>().toEqualTypeOf<
      Format<PersonRef & {_key: string}>[]
    >()
    expectTypeOf<Parsed<typeof Owners>[number]['$refSchema']>().toEqualTypeOf<
      typeof Person
    >()
  })

  test('union member', () => {
    const Company = document({_type: literal('company'), name: string()})
    const Either = union([reference(Person), reference(Company)])
    type InferredMember = Infer<typeof Either>
    expectTypeOf<InferredMember>().toEqualTypeOf<PersonRef>()
    expectTypeOf<Parsed<typeof Either>>().toEqualTypeOf<
      ParsedPersonRef | Format<PersonRef & {$refSchema: typeof Company}>
    >()
  })

  test('optional', () => {
    const Pet = object({owner: optional(reference(Person))})
    expectTypeOf<Infer<typeof Pet>>().toEqualTypeOf<{owner?: PersonRef}>()
    expectTypeOf<Parsed<typeof Pet>>().toEqualTypeOf<{
      owner?: ParsedPersonRef
    }>()
  })

  test('lazy', () => {
    const Pet = object({owner: lazy(() => reference(Person))})
    expectTypeOf<Infer<typeof Pet>['owner']>().toEqualTypeOf<PersonRef>()
    expectTypeOf<Parsed<typeof Pet>['owner']>().toEqualTypeOf<ParsedPersonRef>()
  })

  test('circular schema annotated with SanityReferenceValue', () => {
    interface TreeNode extends SanityDocumentValue {
      parent?: SanityReferenceValue<TreeNode>
      children: SanityArrayValue<SanityReferenceValue<TreeNode>>
    }
    const TreeNode: SanityDocumentType<TreeNode> = document({
      _type: literal('node'),
      parent: optional(lazy(() => reference(TreeNode))),
      children: lazy(() => array(reference(TreeNode))),
    })

    type Inferred = Infer<typeof TreeNode>
    expectTypeOf<NonNullable<Inferred['parent']>>().toEqualTypeOf<PersonRef>()
    expectTypeOf<Inferred['children'][number]>().toEqualTypeOf<
      Format<PersonRef & {_key: string}>
    >()

    // SanityReferenceValue keeps $refSchema optional so hand-written values
    // of the annotated type still typecheck
    type ParsedTreeNode = Parsed<typeof TreeNode>
    expectTypeOf<
      NonNullable<ParsedTreeNode['parent']>['$refSchema']
    >().toEqualTypeOf<SanityType<TreeNode> | undefined>()

    const root: TreeNode = {
      _type: 'node',
      children: [{_key: 'k', _type: 'reference', _ref: 'child'}],
    }
    expectTypeOf(root).toEqualTypeOf<TreeNode>()
  })

  test('thunks are unwrapped by both', () => {
    const getPerson = () => Person
    expectTypeOf<Infer<typeof getPerson>>().toEqualTypeOf<
      Infer<typeof Person>
    >()
    expectTypeOf<Parsed<typeof getPerson>>().toEqualTypeOf<
      Parsed<typeof Person>
    >()
  })
})

describe('parse returns Parsed', () => {
  const Pet = document({
    _type: literal('pet'),
    owner: reference(Person),
  })

  test('parseOrThrow', () => {
    expectTypeOf(parseOrThrow(Pet, {})).toEqualTypeOf<Parsed<typeof Pet>>()
  })

  test('parse', () => {
    const result = parse(Pet, {})
    if (result.ok) {
      expectTypeOf(result.value).toEqualTypeOf<Parsed<typeof Pet>>()
    } else {
      expectTypeOf(result.error).toEqualTypeOf<ParseError>()
    }
  })

  test('Parsed is assignable to Infer, not the other way around', () => {
    const parsedResult = parse(Pet, {})
    assert(parsedResult.ok)
    const parsed = parsedResult.value
    const inferred: Infer<typeof Pet> = parsed
    // @ts-expect-error - $refSchema is required on Parsed
    const back: Parsed<typeof Pet> = inferred
    expectTypeOf(back).toEqualTypeOf<Parsed<typeof Pet>>()
  })
})
