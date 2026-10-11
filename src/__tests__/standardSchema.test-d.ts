import {describe, expectTypeOf, test} from 'vitest'

import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {
  type Infer,
  type Parsed,
  type SanityDocumentType,
  type SanityType,
  type StandardProps,
} from '../defs'
import {type StandardSchemaV1} from '../standardSchema'

const Person = document({_type: literal('person'), name: string()})
const Pet = document({
  _type: literal('pet'),
  name: string(),
  owner: reference(Person),
})

describe('Standard Schema', () => {
  test('every schema is a StandardSchemaV1', () => {
    expectTypeOf(Pet).toMatchTypeOf<StandardSchemaV1>()
    expectTypeOf(string()).toMatchTypeOf<StandardSchemaV1>()
    expectTypeOf(lazy(() => Pet)).toMatchTypeOf<StandardSchemaV1>()
    expectTypeOf<SanityType>().toMatchTypeOf<StandardSchemaV1>()
  })

  test('annotated schema types', () => {
    expectTypeOf<SanityType<string>['~standard']>().toEqualTypeOf<
      StandardProps<string>
    >()
    expectTypeOf<SanityType['~standard']>().toBeAny()
    type Person = Infer<typeof Person>
    expectTypeOf<
      StandardSchemaV1.InferOutput<SanityDocumentType<Person>>
    >().toEqualTypeOf<Person>()
  })

  test('input is the stored value, output is what parse returns', () => {
    expectTypeOf<StandardSchemaV1.InferInput<typeof Pet>>().toEqualTypeOf<
      Infer<typeof Pet>
    >()
    expectTypeOf<StandardSchemaV1.InferOutput<typeof Pet>>().toEqualTypeOf<
      Parsed<typeof Pet>
    >()
    expectTypeOf<StandardSchemaV1.InferOutput<typeof Pet>>().toEqualTypeOf<{
      _type: 'pet'
      name: string
      owner: Parsed<typeof Pet>['owner']
      _id?: string
      _rev?: string
      _createdAt?: string
      _updatedAt?: string
    }>()
    expectTypeOf<
      keyof StandardSchemaV1.InferInput<typeof Pet>['owner']
    >().toEqualTypeOf<'_type' | '_ref' | '_weak'>()
    expectTypeOf<
      keyof StandardSchemaV1.InferOutput<typeof Pet>['owner']
    >().toEqualTypeOf<'_type' | '_ref' | '_weak' | '$refSchema'>()
  })

  test('validate returns the parsed value, synchronously', () => {
    const result = Pet['~standard'].validate({})
    expectTypeOf(result).toEqualTypeOf<
      StandardSchemaV1.Result<Parsed<typeof Pet>>
    >()
  })
})
