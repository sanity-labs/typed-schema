import {expectTypeOf, test} from 'vitest'

import {document} from '../creators/document'
import {file} from '../creators/file'
import {image} from '../creators/image'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {optional} from '../creators/optional'
import {string} from '../creators/string'
import {
  type SanityAny,
  type SanityLiteral,
  type SanityNumber,
  type SanityString,
} from '../defs'
import {
  type FieldErrors,
  type InvalidFieldNames,
  type RequireTypeField,
  type SystemFieldErrors,
} from '../helpers/schemaErrors'
import {
  type FieldNameError,
  type SchemaError,
  type ValidFieldName,
} from '../helpers/utilTypes'
import {extend} from '../utils/extend'

test('field values must be schemas', () => {
  const Base = object({_type: literal('base'), name: string()})

  // @ts-expect-error - 'bar' is not a schema
  object({_type: literal('x'), foo: 'bar'})
  // @ts-expect-error - a creator function is not a schema
  object({_type: literal('x'), foo: string})
  // @ts-expect-error - 'bar' is not a schema
  document({_type: literal('x'), foo: 'bar'})
  // @ts-expect-error - 'bar' is not a schema
  extend(Base, {foo: 'bar'})
  // @ts-expect-error - 'bar' is not a schema
  image({foo: 'bar'})
  // @ts-expect-error - 'bar' is not a schema
  file({foo: 'bar'})
  // @ts-expect-error - a schema needs an output type
  object({_type: literal('x'), foo: {typeName: 'string'}})

  object({_type: literal('x'), foo: string(), bar: optional(number())})
  document({_type: literal('x'), foo: string()})
  extend(Base, {foo: string()})
})

test('a non-schema value next to a getter field is rejected', () => {
  // A self-reference would also become `any` here, because the call fails
  object({
    _type: literal('node'),
    // @ts-expect-error - 1 is not a schema
    value: 1,
    get next() {
      return optional(string())
    },
  })
})

test('optional fields of a typed shape are checked', () => {
  const invalid: {_type: SanityLiteral<'x'>; foo?: string} = {
    _type: literal('x'),
  }
  // @ts-expect-error - foo is not a schema
  object(invalid)

  const valid: {_type: SanityLiteral<'x'>; foo?: SanityString} = {
    _type: literal('x'),
  }
  object(valid)
})

test('field names must start with a letter and contain only letters, digits and underscores', () => {
  const Base = object({_type: literal('base'), name: string()})

  // @ts-expect-error - hyphens are not allowed
  object({_type: literal('x'), 'e-mail': string()})
  // @ts-expect-error - hyphens are not allowed
  document({_type: literal('x'), 'e-mail': string()})
  // @ts-expect-error - hyphens are not allowed
  extend(Base, {'e-mail': string()})
  // @ts-expect-error - hyphens are not allowed
  image({'e-mail': string()})
  // @ts-expect-error - hyphens are not allowed
  file({'e-mail': string()})
  // @ts-expect-error - spaces are not allowed
  object({_type: literal('x'), 'first name': string()})
  // @ts-expect-error - must start with a letter
  object({_type: literal('x'), '1st': string()})
  // @ts-expect-error - must start with a letter
  object({_type: literal('x'), 1: string()})
  // @ts-expect-error - fields starting with `_` are reserved
  object({_type: literal('x'), _custom: string()})
  // @ts-expect-error - fields starting with `_` are reserved
  extend(Base, {_custom: string()})
  // @ts-expect-error - fields starting with `_` are reserved
  image({_custom: string()})
  // @ts-expect-error - only letters A-Z
  object({_type: literal('x'), élan: string()})
  // @ts-expect-error - field names must be strings
  object({_type: literal('x'), [Symbol('field')]: string()})

  object({
    _type: literal('x'),
    name: string(),
    firstName: string(),
    first_name: string(),
    line2: string(),
    A_1_b: string(),
  })
  document({_type: literal('x'), _id: string(), first_name: string()})
  extend(Base, {_type: literal('renamed'), first_name: string()})
  extend(document({_type: literal('doc')}), {_id: literal('doc.id')})
  image({alt_text: string()})
  file({caption2: string()})
})

test('invalid field names report why', () => {
  expectTypeOf<
    FieldNameError<'e-mail'>
  >().toEqualTypeOf<"Field name 'e-mail' can only contain letters A-Z, digits and underscores">()
  expectTypeOf<
    FieldNameError<'1st'>
  >().toEqualTypeOf<"Field name '1st' must start with a letter A-Z">()
  expectTypeOf<
    FieldNameError<'_custom'>
  >().toEqualTypeOf<"Field name '_custom' is reserved: names starting with '_' are for system fields">()
  expectTypeOf<
    FieldNameError<'élan'>
  >().toEqualTypeOf<"Field name 'élan' must start with a letter A-Z">()
  expectTypeOf<
    FieldNameError<symbol>
  >().toEqualTypeOf<'Field names must be strings'>()
  expectTypeOf<FieldNameError<'first_name2'>>().toBeNever()

  expectTypeOf<ValidFieldName<'first_name2'>>().toEqualTypeOf<'first_name2'>()
  expectTypeOf<ValidFieldName<'e-mail'>>().toBeNever()
})

test('a SchemaError intersected with a primitive keeps the message', () => {
  expectTypeOf<number & SchemaError<'message'>>().not.toBeNever()
  expectTypeOf<string & SchemaError<'message'>>().not.toBeNever()
})

test('invalid field names map to a SchemaError with the message', () => {
  expectTypeOf<
    InvalidFieldNames<
      {
        _type: SanityLiteral<'x'>
        name: SanityString
        'e-mail': SanityString
      },
      '_type'
    >
  >().toEqualTypeOf<{
    'e-mail': SchemaError<"Field name 'e-mail' can only contain letters A-Z, digits and underscores">
  }>()
})

test('fields that are not schemas map to a SchemaError with the message', () => {
  type Errors = FieldErrors<
    {_type: SanityLiteral<'x'>; name: SanityString; foo: string},
    '_type'
  >
  expectTypeOf<Errors['foo']>().toEqualTypeOf<
    SanityAny | SchemaError<"Field 'foo' is not a schema">
  >()
  expectTypeOf<keyof Errors>().toEqualTypeOf<'foo'>()

  // An invalid name is reported instead, so the two messages do not conflict
  expectTypeOf<FieldErrors<{'e-mail': string}>['e-mail']>().toEqualTypeOf<
    SchemaError<"Field name 'e-mail' can only contain letters A-Z, digits and underscores">
  >()
  // @ts-expect-error - invalid name and not a schema
  object({_type: literal('x'), 'e-mail': 'bar'})
  // @ts-expect-error - invalid name and not a schema
  object({_type: literal('x'), 'e-mail': 1})
})

test('a document needs a _type literal and a string _id', () => {
  // @ts-expect-error - _type must be a literal
  document({_type: string(), title: string()})
  // @ts-expect-error - _type must be a string literal
  document({_type: literal(1)})
  // @ts-expect-error - _type is required
  document({title: string()})
  // @ts-expect-error - _id must be a string schema
  document({_type: literal('x'), _id: number()})
  // @ts-expect-error - _id is not a schema
  document({_type: literal('x'), _id: 'id'})

  document({_type: literal('x'), _id: string()})
  document({_type: literal('x'), _id: literal('x.id')})
})

test('invalid document system fields map to a SchemaError with the message', () => {
  expectTypeOf<
    SystemFieldErrors<{_type: SanityString; _id: SanityNumber}>
  >().toEqualTypeOf<{
    _type: SchemaError<"document() field '_type' must be a string literal(), e.g. literal('post')">
    _id: SchemaError<"document() field '_id' must be string() or a string literal()">
  }>()
  expectTypeOf<
    RequireTypeField<{title: SanityString}>['_type']
  >().toEqualTypeOf<
    SchemaError<"document() needs a _type field, e.g. _type: literal('post')">
  >()
  expectTypeOf<
    keyof SystemFieldErrors<{_type: SanityLiteral<'x'>; _id: SanityString}>
  >().toBeNever()
  expectTypeOf<
    RequireTypeField<{_type: SanityLiteral<'x'>}>
  >().toEqualTypeOf<unknown>()
})
