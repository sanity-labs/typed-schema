import {assertType, expectTypeOf, test} from 'vitest'

import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {string} from '../creators/string'
import {
  type DocumentSchemaOf,
  type Infer,
  type LazySchema,
  type Schema,
} from '../defs'
import {type Committed, committed, partial} from '../lifecycle'
import {type DocumentBase, type DocumentValue} from '../shapeDefs'
import {type DeepPartial, deepPartial} from '../utils/deepPartial'

const Pet = document({
  _type: literal('pet'),
  name: string(),
  nickname: optional(string()),
  owner: object({name: string()}),
})

type CommittedPet = {
  _type: 'pet'
  _id: string
  _rev: string
  _createdAt: string
  _updatedAt: string
  name: string
  nickname?: string
  owner: {name: string}
}

test('committed() returns Committed<typeof Doc>', () => {
  expectTypeOf(committed(Pet)).toEqualTypeOf<Committed<typeof Pet>>()
})

test('partial() returns DeepPartial<typeof Doc>', () => {
  expectTypeOf(partial(Pet)).toEqualTypeOf<DeepPartial<typeof Pet>>()
  expectTypeOf(partial(Pet)).toEqualTypeOf(deepPartial(Pet))
  // @ts-expect-error partial() only accepts documents
  partial(object({name: string()}))
})

// The 2x2 grid: completeness (base vs partial) by persistence (base vs
// committed). Each cell checks a system field and a declared field.

test('Pet: complete, not committed', () => {
  type Local = Infer<typeof Pet>
  expectTypeOf<Local>().toEqualTypeOf<{
    _type: 'pet'
    _id?: string
    _rev?: string
    _createdAt?: string
    _updatedAt?: string
    name: string
    nickname?: string
    owner: {name: string}
  }>()
  expectTypeOf<Local['_id']>().toEqualTypeOf<string | undefined>()
  expectTypeOf<Local['_rev']>().toEqualTypeOf<string | undefined>()
  expectTypeOf<Local['name']>().toEqualTypeOf<string>()
  assertType<Local>({_type: 'pet', name: 'Fido', owner: {name: 'Ann'}})
  // @ts-expect-error name is required on a complete document
  assertType<Local>({_type: 'pet', owner: {name: 'Ann'}})
})

test('partial(Pet): partial, not committed', () => {
  type PartialPet = Infer<DeepPartial<typeof Pet>>
  expectTypeOf<PartialPet>().toEqualTypeOf<{
    _type: 'pet'
    _id?: string
    _rev?: string
    _createdAt?: string
    _updatedAt?: string
    name?: string
    nickname?: string
    owner?: {name?: string}
  }>()
  expectTypeOf<PartialPet['_id']>().toEqualTypeOf<string | undefined>()
  expectTypeOf<PartialPet['_rev']>().toEqualTypeOf<string | undefined>()
  expectTypeOf<PartialPet['name']>().toEqualTypeOf<string | undefined>()
  assertType<PartialPet>({_type: 'pet'})
  // @ts-expect-error _type stays required
  assertType<PartialPet>({name: 'Fido'})
})

test('committed(Pet): complete and committed', () => {
  type Complete = Infer<Committed<typeof Pet>>
  expectTypeOf<Complete>().toEqualTypeOf<CommittedPet>()
  expectTypeOf<Complete['_id']>().toEqualTypeOf<string>()
  expectTypeOf<Complete['_rev']>().toEqualTypeOf<string>()
  expectTypeOf<Complete['name']>().toEqualTypeOf<string>()
  assertType<Complete>({
    _type: 'pet',
    _id: 'fido',
    _rev: 'r1',
    _createdAt: '2024-01-01T00:00:00Z',
    _updatedAt: '2024-01-01T00:00:00Z',
    name: 'Fido',
    owner: {name: 'Ann'},
  })
  // @ts-expect-error _rev is required on a committed document
  assertType<Complete>({
    _type: 'pet',
    _id: 'fido',
    _createdAt: '2024-01-01T00:00:00Z',
    _updatedAt: '2024-01-01T00:00:00Z',
    name: 'Fido',
    owner: {name: 'Ann'},
  })
})

test('committed(partial(Pet)): partial and committed', () => {
  type CommittedPartial = Infer<Committed<DeepPartial<typeof Pet>>>
  expectTypeOf(committed(partial(Pet))).toEqualTypeOf<
    Committed<DeepPartial<typeof Pet>>
  >()
  expectTypeOf<CommittedPartial>().toEqualTypeOf<{
    _type: 'pet'
    _id: string
    _rev: string
    _createdAt: string
    _updatedAt: string
    name?: string
    nickname?: string
    owner?: {name?: string}
  }>()
  expectTypeOf<CommittedPartial['_id']>().toEqualTypeOf<string>()
  expectTypeOf<CommittedPartial['_rev']>().toEqualTypeOf<string>()
  expectTypeOf<CommittedPartial['name']>().toEqualTypeOf<string | undefined>()
  assertType<CommittedPartial>({
    _type: 'pet',
    _id: 'drafts.fido',
    _rev: 'r1',
    _createdAt: '2024-01-01T00:00:00Z',
    _updatedAt: '2024-01-01T00:00:00Z',
  })
  // @ts-expect-error _id is required on a committed document
  assertType<CommittedPartial>({_type: 'pet'})
})

test('Committed applies to value-annotated document schemas', () => {
  type PetValue = {_type: 'pet'; name: string} & DocumentValue
  type CommittedAnnotated = Committed<DocumentSchemaOf<PetValue>>
  expectTypeOf<CommittedAnnotated>().toMatchTypeOf<DocumentSchemaOf<any>>()
  expectTypeOf<Infer<CommittedAnnotated>>().toEqualTypeOf<{
    _type: 'pet'
    _id: string
    _rev: string
    _createdAt: string
    _updatedAt: string
    name: string
  }>()
})

test('Committed transforms the target of a lazy schema', () => {
  const LazyPet = lazy(() => Pet)
  expectTypeOf<Committed<typeof LazyPet>>().toEqualTypeOf<
    LazySchema<Committed<typeof Pet>>
  >()
  expectTypeOf<Infer<Committed<typeof LazyPet>>>().toEqualTypeOf<CommittedPet>()
})

test('Committed applies to the base document schema', () => {
  expectTypeOf<Infer<Committed<typeof DocumentBase>>>().toEqualTypeOf<{
    _type: string
    _id: string
    _rev: string
    _createdAt: string
    _updatedAt: string
  }>()
})

test('Committed rejects non-document schemas', () => {
  // @ts-expect-error a string schema has no system fields to require
  type _Invalid = Committed<Schema<string>>
})
