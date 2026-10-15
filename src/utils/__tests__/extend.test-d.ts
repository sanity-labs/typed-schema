import {assertType, expectTypeOf, test} from 'vitest'

import {block} from '../../creators/block'
import {document} from '../../creators/document'
import {file} from '../../creators/file'
import {image} from '../../creators/image'
import {literal} from '../../creators/literal'
import {number} from '../../creators/number'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {reference} from '../../creators/reference'
import {string} from '../../creators/string'
import {union} from '../../creators/union'
import {
  type Infer,
  type LiteralSchema,
  type NumberSchema,
  type ObjectSchema,
  type ObjectUnionSchema,
  type OptionalSchema,
  type Schema,
  type StringSchema,
  type TypedObjectSchema,
} from '../../defs'
import {
  type ExtendSourceError,
  type ExtendTypeFieldError,
} from '../../helpers/schemaErrors'
import {type SchemaError} from '../../helpers/utilTypes'
import {type Extends, extend} from '../extend'

const Hero = object({_type: literal('hero'), title: string()})
const Gallery = object({_type: literal('gallery'), images: number()})
const Section = union([Hero, Gallery])

test('extend on an object adds and replaces fields', () => {
  const Named = object({name: string(), age: string()})
  const Extended = extend(Named, {age: number(), email: optional(string())})
  expectTypeOf(Extended).toEqualTypeOf<
    ObjectSchema<{
      name: StringSchema
      age: NumberSchema
      email: OptionalSchema<StringSchema>
    }>
  >()
})

test('extend on a union extends every member', () => {
  const Extended = extend(Section, {anchor: optional(string())})
  expectTypeOf(Extended).toEqualTypeOf<
    ObjectUnionSchema<
      | ObjectSchema<{
          _type: LiteralSchema<'hero'>
          title: StringSchema
          anchor: OptionalSchema<StringSchema>
        }>
      | ObjectSchema<{
          _type: LiteralSchema<'gallery'>
          images: NumberSchema
          anchor: OptionalSchema<StringSchema>
        }>
    >
  >()
  expectTypeOf<
    Extends<typeof Section, {anchor: OptionalSchema<StringSchema>}>
  >().toEqualTypeOf<typeof Extended>()
})

test('members of an extended union keep their _type literals', () => {
  const Extended = extend(Section, {anchor: string()})
  type Extended = Infer<typeof Extended>
  expectTypeOf<Extended['_type']>().toEqualTypeOf<'hero' | 'gallery'>()
  expectTypeOf<Extended['anchor']>().toEqualTypeOf<string>()
  assertType<Extended>({_type: 'hero', title: 'Welcome', anchor: 'top'})
  assertType<Extended>({_type: 'gallery', images: 3, anchor: 'photos'})
  // @ts-expect-error - title belongs to hero, not gallery
  assertType<Extended>({_type: 'gallery', images: 3, anchor: 'a', title: 'x'})
  // @ts-expect-error - anchor is required on every member
  assertType<Extended>({_type: 'hero', title: 'Welcome'})
})

test('extend on a union replaces fields on the members that have them', () => {
  const Extended = extend(Section, {title: number()})
  type Extended = Infer<typeof Extended>
  expectTypeOf<
    Extract<Extended, {_type: 'hero'}>['title']
  >().toEqualTypeOf<number>()
  expectTypeOf<
    Extract<Extended, {_type: 'gallery'}>['title']
  >().toEqualTypeOf<number>()
})

test('an extended union can be extended again', () => {
  const Extended = extend(extend(Section, {anchor: string()}), {
    theme: literal('dark'),
  })
  type Extended = Infer<typeof Extended>
  expectTypeOf<Extended['_type']>().toEqualTypeOf<'hero' | 'gallery'>()
  expectTypeOf<Extended['anchor']>().toEqualTypeOf<string>()
  expectTypeOf<Extended['theme']>().toEqualTypeOf<'dark'>()
})

test('extend on a union rejects members that are not objects', () => {
  const Author = document({_type: literal('author'), name: string()})
  const WithReference = union([Hero, reference(Author)])
  // @ts-expect-error - a reference has a fixed shape
  extend(WithReference, {anchor: string()})
  const WithBlock = union([Hero, block({})])
  // @ts-expect-error - a block has a fixed shape
  extend(WithBlock, {anchor: string()})
  const WithImage = union([Hero, image()])
  // @ts-expect-error - an image has a fixed shape
  extend(WithImage, {anchor: string()})
  const WithFile = union([Hero, file()])
  // @ts-expect-error - a file has a fixed shape
  extend(WithFile, {anchor: string()})
  expectTypeOf<ExtendSourceError<typeof WithReference>>().toEqualTypeOf<
    SchemaError<'extend() can only extend a union() of objects, not one with reference(), block(), image() or file() members'>
  >()
  expectTypeOf<ExtendSourceError<typeof Section>>().toEqualTypeOf<unknown>()
  expectTypeOf<ExtendSourceError<typeof Hero>>().toEqualTypeOf<unknown>()
})

test('extend on a union cannot replace _type', () => {
  // @ts-expect-error - the members would all get the same _type
  extend(Section, {_type: literal('section')})
  expectTypeOf<
    ExtendTypeFieldError<typeof Section, {_type: LiteralSchema<'section'>}>
  >().toEqualTypeOf<{
    _type: SchemaError<'extend() cannot replace _type on a union(): its members are told apart by their _type literals'>
  }>()
  expectTypeOf<
    ExtendTypeFieldError<typeof Section, {anchor: StringSchema}>
  >().toEqualTypeOf<unknown>()
  // _type can still be replaced on a single object
  const Renamed = extend(Hero, {_type: literal('banner')})
  expectTypeOf<Infer<typeof Renamed>['_type']>().toEqualTypeOf<'banner'>()
  expectTypeOf<
    ExtendTypeFieldError<typeof Hero, {_type: LiteralSchema<'banner'>}>
  >().toEqualTypeOf<unknown>()
})

test('extend on a union accepts a shape built at runtime', () => {
  // Checked at runtime instead: the fields of an index signature are unknown
  const fields: Record<string, Schema> = {anchor: string()}
  extend(Section, fields)
  expectTypeOf<
    ExtendTypeFieldError<typeof Section, Record<string, Schema>>
  >().toEqualTypeOf<unknown>()
})

test('generic code can extend any union of objects', () => {
  function withAnchor<Union extends ObjectUnionSchema<TypedObjectSchema>>(
    sections: Union,
  ) {
    return extend(sections, {anchor: string()})
  }
  type Extended = Infer<ReturnType<typeof withAnchor<typeof Section>>>
  expectTypeOf<Extended['_type']>().toEqualTypeOf<'hero' | 'gallery'>()
  expectTypeOf<Extended['anchor']>().toEqualTypeOf<string>()
})

test('extend on a union checks the field names', () => {
  // @ts-expect-error - names starting with _ are reserved
  extend(Section, {_anchor: string()})
  // @ts-expect-error - every field must be a schema
  extend(Section, {anchor: 'top'})
})

test('extend on a wide union infers every member', () => {
  // Wide enough that a regression in inference cost shows up in test time
  const Wide = union([
    object({_type: literal('s01'), a: string()}),
    object({_type: literal('s02'), b: string()}),
    object({_type: literal('s03'), c: string()}),
    object({_type: literal('s04'), d: string()}),
    object({_type: literal('s05'), e: string()}),
    object({_type: literal('s06'), f: string()}),
    object({_type: literal('s07'), g: string()}),
    object({_type: literal('s08'), h: string()}),
    object({_type: literal('s09'), i: string()}),
    object({_type: literal('s10'), j: string()}),
    object({_type: literal('s11'), k: string()}),
    object({_type: literal('s12'), l: string()}),
  ])
  const Extended = extend(Wide, {anchor: optional(string()), theme: string()})
  type Extended = Infer<typeof Extended>
  expectTypeOf<Extended['_type']>().toEqualTypeOf<
    | 's01'
    | 's02'
    | 's03'
    | 's04'
    | 's05'
    | 's06'
    | 's07'
    | 's08'
    | 's09'
    | 's10'
    | 's11'
    | 's12'
  >()
  expectTypeOf<Extended['theme']>().toEqualTypeOf<string>()
  expectTypeOf<Extract<Extended, {_type: 's12'}>['l']>().toEqualTypeOf<string>()
  assertType<Extended>({_type: 's07', g: 'x', theme: 'dark'})
  // @ts-expect-error - g belongs to s07
  assertType<Extended>({_type: 's01', a: 'x', theme: 'dark', g: 'y'})
})
