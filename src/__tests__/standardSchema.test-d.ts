import {describe, expectTypeOf, test} from 'vitest'

import {array} from '../creators/array'
import {document} from '../creators/document'
import {lazy} from '../creators/lazy'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
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
import {extend} from '../utils/extend'
import {rename} from '../utils/rename'

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

  test('extended, renamed and object array element schemas', () => {
    const Named = extend(object({a: string()}), {b: number()})
    expectTypeOf<StandardSchemaV1.InferOutput<typeof Named>>().toEqualTypeOf<{
      a: string
      b: number
    }>()
    const Cat = rename(Pet, 'cat')
    expectTypeOf<
      StandardSchemaV1.InferOutput<typeof Cat>['_type']
    >().toEqualTypeOf<'cat'>()
    const element = array(object({n: number()})).element
    expectTypeOf<StandardSchemaV1.InferOutput<typeof element>>().toEqualTypeOf<{
      n: number
      _key: string
    }>()
  })

  test('validate returns the parsed value, synchronously', () => {
    const result = Pet['~standard'].validate({})
    expectTypeOf(result).toEqualTypeOf<
      StandardSchemaV1.Result<Parsed<typeof Pet>>
    >()
  })
})
