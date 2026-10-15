import {expectTypeOf, test} from 'vitest'

import {array} from '../creators/array'
import {block} from '../creators/block'
import {document} from '../creators/document'
import {enum as enumOf} from '../creators/enum'
import {literal} from '../creators/literal'
import {number, safeint} from '../creators/number'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {portableText} from '../creators/portableText'
import {reference} from '../creators/reference'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {
  type AnnotationText,
  type DocumentSchema,
  type ExampleValue,
  type Infer,
  type LiteralSchema,
  type NumberSchema,
  type ObjectSchema,
  type SchemaAnnotations,
  type StringSchema,
} from '../defs'
import {getAnnotations} from '../helpers/annotations'
import {
  type ArrayElementError,
  type InvalidAnnotations,
  type ObjectArrayElementError,
  type PrimitiveArrayElementError,
  type ReferenceTargetError,
} from '../helpers/schemaErrors'
import {parseOrThrow} from '../parse'

test('annotations do not change the schema type', () => {
  expectTypeOf(string({description: 'x'})).toEqualTypeOf<StringSchema>()
  expectTypeOf(number({min: 1, description: 'x'})).toEqualTypeOf<NumberSchema>()
  expectTypeOf(safeint({description: 'x'})).toEqualTypeOf<NumberSchema>()
  expectTypeOf(object({name: string()}, {description: 'x'})).toEqualTypeOf<
    ObjectSchema<{name: StringSchema}>
  >()
})

test('annotations do not affect shape inference', () => {
  const Pet = document(
    {_type: literal('pet'), name: string(), age: optional(number())},
    {examples: [{_type: 'pet', name: 'Fido'}]},
  )
  expectTypeOf<Infer<typeof Pet>>().toMatchTypeOf<{
    _type: 'pet'
    name: string
    age?: number
  }>()
})

test('examples are checked against the output type', () => {
  string({examples: ['a']})
  // @ts-expect-error a string example is not a number
  number({examples: ['12']})

  enumOf(['dog', 'cat'], {examples: ['dog']})
  // @ts-expect-error not a member of the enum
  enumOf(['dog', 'cat'], {examples: ['bird']})

  literal('pet', {examples: ['pet']})
  // @ts-expect-error not the literal value
  literal('pet', {examples: ['dog']})

  object({city: string()}, {examples: [{city: 'Oslo'}]})
  // @ts-expect-error wrong property type
  object({city: string()}, {examples: [{city: 1}]})

  array(object({city: string()}), {examples: [[{city: 'Oslo', _key: 'a'}]]})
  // @ts-expect-error array items must carry _key
  array(object({city: string()}), {examples: [[{city: 'Oslo'}]]})

  array(string(), {examples: [['a', 'b']]})
  // @ts-expect-error primitive array of the wrong type
  array(string(), {examples: [[1]]})

  union([string(), number()], {examples: ['a', 1]})
  // @ts-expect-error not a member type
  union([string(), number()], {examples: [true]})
  const Link = object({_type: literal('link'), href: string()})
  union([Link], {examples: [{_type: 'link', href: 'x'}]})
  // @ts-expect-error href is required
  union([Link], {examples: [{_type: 'link'}]})

  const Heading = block({style: literal('h1')})
  const h1 = parseOrThrow(Heading, {_type: 'block', children: []})
  const h2 = parseOrThrow(block({style: literal('h2')}), {
    _type: 'block',
    children: [],
  })
  block({style: literal('h1')}, {examples: [h1]})
  // @ts-expect-error style must be 'h1'
  block({style: literal('h1')}, {examples: [h2]})

  const Other = object({_type: literal('other')})
  const otherText = parseOrThrow(
    portableText({block: Heading, element: Other}),
    [],
  )
  portableText({block: Heading, element: Link}, {examples: [[]]})
  // @ts-expect-error not a block or link
  portableText({block: Heading, element: Link}, {examples: [otherText]})

  // a call that fails the catch-all overload is an error, not `never`
  // @ts-expect-error unknown key
  array(string(), {placeholder: 'x'})

  const Person = document({_type: literal('person'), name: string()})
  reference(Person, {examples: [{_type: 'reference', _ref: 'abc'}]})
  // @ts-expect-error unknown key
  reference(Person, {bogus: true})
  // @ts-expect-error _ref is required
  reference(Person, {examples: [{_type: 'reference'}]})

  document(
    {_type: literal('pet'), name: string()},
    {examples: [{_type: 'pet', name: 'Fido'}]},
  )
  document(
    {_type: literal('pet'), name: string()},
    // @ts-expect-error name is required
    {examples: [{_type: 'pet'}]},
  )
})

test('invalid annotations report why', () => {
  // valid first arguments resolve the catch-all's message to the annotations
  expectTypeOf<ArrayElementError<StringSchema>>().toEqualTypeOf<
    InvalidAnnotations<'array'>
  >()
  expectTypeOf<
    ObjectArrayElementError<ObjectSchema<{_type: LiteralSchema<'x'>}>>
  >().toEqualTypeOf<InvalidAnnotations<'objectArray'>>()
  expectTypeOf<PrimitiveArrayElementError<StringSchema>>().toEqualTypeOf<
    InvalidAnnotations<'primitiveArray'>
  >()
  expectTypeOf<ReferenceTargetError<DocumentSchema>>().toEqualTypeOf<
    InvalidAnnotations<'reference'>
  >()
  // invalid first arguments keep their own message
  expectTypeOf<
    ObjectArrayElementError<StringSchema>
  >().toEqualTypeOf<'objectArray() elements must be objects, references, blocks, images, files or unions of these'>()
  expectTypeOf<
    PrimitiveArrayElementError<ObjectSchema>
  >().toEqualTypeOf<'primitiveArray() elements must be primitives, literals or unions of these'>()
  expectTypeOf<
    ReferenceTargetError<ObjectSchema>
  >().toEqualTypeOf<'reference() target must be a document schema or a union() of document schemas'>()
  expectTypeOf<
    InvalidAnnotations<'union'>
  >().toEqualTypeOf<'union() annotations are invalid: examples must be values of the schema and keys must be title, description, guidelines, examples, deprecated or readOnly'>()
})

test('annotations are a closed set', () => {
  // @ts-expect-error unknown key
  string({placeholder: 'x'})
  // @ts-expect-error unknown key
  object({name: string()}, {hidden: true})
})

test('AnnotationText can require a set of locales', () => {
  type Text = AnnotationText<'en' | 'nb'>
  const t = (text: Text) => text
  string({description: t('plain')})
  string({description: t({en: 'a', nb: 'b'})})
  // @ts-expect-error nb is missing
  t({en: 'a'})
  // @ts-expect-error no is not a declared locale
  t({en: 'a', nb: 'b', no: 'c'})
  const annotations = {
    title: {en: 'Pet', nb: 'Kjæledyr'},
  } satisfies SchemaAnnotations<unknown, 'en' | 'nb'>
  document({_type: literal('pet')}, annotations)
})

test('text accepts a string or a locale map', () => {
  string({description: 'x'})
  string({description: {en: 'x', nb: 'y'}})
  // @ts-expect-error not a locale map
  string({description: 1})
  // @ts-expect-error examples are values, not text
  string({examples: {en: 'x'}})
})

test('getAnnotations resolves to strings and keeps typed examples', () => {
  const Pet = document({_type: literal('pet'), name: string()})
  const annotations = getAnnotations(Pet)
  expectTypeOf(annotations?.description).toEqualTypeOf<string | undefined>()
  expectTypeOf(annotations?.examples).toEqualTypeOf<
    ExampleValue<Infer<typeof Pet>>[] | undefined
  >()
})

test('examples of references omit the phantom schema key', () => {
  const Person = document({_type: literal('person'), name: string()})
  const Pet = document({_type: literal('pet'), owner: reference(Person)})
  expectTypeOf<ExampleValue<Infer<typeof Pet>>>().toEqualTypeOf<{
    _type: 'pet'
    owner: {_type: 'reference'; _ref: string; _weak?: boolean}
    _id?: string
    _createdAt?: string
    _updatedAt?: string
    _rev?: string
  }>()
})

test('SchemaAnnotations is exported with its output parameter', () => {
  const annotations: SchemaAnnotations<number> = {examples: [1]}
  expectTypeOf(annotations.examples).toEqualTypeOf<number[] | undefined>()
})
