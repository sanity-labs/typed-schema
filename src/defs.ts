import {
  type Flatten,
  type IsAny,
  type OutputFormatFix,
  type XOR,
} from './helpers/utilTypes'
import {
  type ReferenceBase,
  type SanityDocumentShape,
  type SanityDocumentValue,
  type SanityFileShape,
  type SanityImageShape,
  type SanityReferenceShape,
} from './shapeDefs'
import {type StandardSchemaV1} from './standardSchema'

/**
 * This file contains the core interfaces for various types. The builders defined in ./builder are implementations of these.
 *
 * Recursive schemas are declared with getters (`get children() { return array(Node) }`),
 * which TypeScript can only infer if nothing reads the getter's type while the
 * schema itself is being inferred. That rules out two things in this file:
 *
 * - Type parameter constraints that compare output types. Constraints match on
 *   `typeName` (see the `*Kind` types) or compare against `SanityType<any>`,
 *   which accepts any output without reading it.
 * - Output types computed eagerly. Declare a computed output as a member
 *   (`output: OutputFromShape<Shape>`), not as a type parameter with a default
 *   (`Output = OutputFromShape<Shape>`). TypeScript computes a member's type
 *   the first time something reads it, after the schema exists. It computes a
 *   default as soon as the type is used, and `object()` uses
 *   `SanityObject<Shape>` as its return type while the schema is still being
 *   inferred.
 *
 * TypeScript 7 still infers some schemas that break these rules, but
 * TypeScript 6 does not, so `pnpm typecheck:ts6` runs the type tests with
 * TypeScript 6.
 */
export interface SanityType<Output = any> {
  typeName: string
  /**
   * What the value means and how to author it. See {@link SchemaAnnotations}.
   * Typed without `Output`: a member that reads the output type breaks the
   * inference of recursive schemas (see the top of this file). The creators
   * type `examples` against the output, and `getAnnotations` reads it back
   * typed.
   */
  annotations?: SchemaAnnotations
  /**
   * @deprecated ** DO NOT USE ** This will throw an error if you try to access it at runtime
   */
  output: Output
  /**
   * The {@link https://standardschema.dev | Standard Schema} properties:
   * `validate` runs `parse`, and the input type is the value as stored
   * ({@link Infer}) while the output type is what `parse` returns
   * ({@link Parsed}). Not enumerable, so `JSON.stringify` ignores it.
   *
   * `any` when `Output` is `any`, so that `SanityType` (the constraint every
   * creator matches on) accepts a schema without comparing this member.
   * Compared against `StandardProps<any>` instead, TypeScript 6 evaluates the
   * schema's output type, which reads the getters of a recursive schema while
   * it is still being inferred.
   */
  readonly '~standard': IsAny<Output> extends true ? any : StandardProps<Output>
}

/**
 * The type of a schema's `~standard` property: the Standard Schema
 * properties, with the schema's stored value ({@link Infer}) as input type and
 * what `parse` returns ({@link Parsed}) as output type. Interfaces that
 * declare their own `output` member (see the note at the top of this file)
 * declare this next to it with the same type.
 */
export interface StandardProps<Output> extends StandardSchemaV1.Props<
  StripRefSchema<Output>,
  Output
> {
  /** Validates `value` against the schema with `parse`, synchronously */
  readonly validate: (value: unknown) => StandardSchemaV1.Result<Output>
}

/**
 * Text in schema annotations: a plain string, or one string per locale (BCP 47
 * tags, e.g. `'en'` or `'nb-NO'`). `getAnnotations` resolves a locale map to
 * a single string.
 *
 * `Locale` lets a project declare its locales so a map with a missing or
 * misspelled one is a compile error: `AnnotationText<'en' | 'nb'>` requires
 * both. The schema itself does not carry the set; it stays `string` for the
 * creators and `getAnnotations`.
 */
export type AnnotationText<Locale extends string = string> =
  | string
  | {[locale in Locale]: string}

/**
 * Annotations describe the content model: what a value means and how to
 * author a good one. They never describe a consumer of the model, so there
 * are no keys for how a value is rendered, which input edits it or which tool
 * reads it. The same annotations serve a form, a generating agent, generated
 * documentation and a test suite.
 *
 * The keys follow the JSON Schema annotation vocabulary (`title`,
 * `description`, `examples`, `deprecated`, `readOnly`) plus `guidelines`.
 *
 * Every creator accepts them as its last argument: `string({description: '...'})`.
 */
export type SchemaAnnotations<
  Output = unknown,
  Locale extends string = string,
> = {
  /** Short human label for the type or field */
  title?: AnnotationText<Locale>
  /** What the value is and why it exists */
  description?: AnnotationText<Locale>
  /** How to write a good value, for whoever authors it: length, tone, what to leave out */
  guidelines?: AnnotationText<Locale>
  /** Valid values, checked against the inferred output type. See `validateExamples` */
  examples?: ExampleValue<Output>[]
  /** Reason the value should no longer be written, and what replaces it */
  deprecated?: AnnotationText<Locale>
  /** The value is managed by the system that owns the content; nothing authoring against the schema should write it */
  readOnly?: boolean
}

/**
 * The output type, written as a literal value: the phantom
 * `$refSchema` key that parsed reference values have for type-level lookups
 * is removed, recursively
 */
export type ExampleValue<T> = T extends (infer Element)[]
  ? ExampleValue<Element>[]
  : T extends object
    ? {
        [K in keyof T as K extends typeof REF_SCHEMA ? never : K]: ExampleValue<
          T[K]
        >
      }
    : T

/** Resolved annotations, as returned by `getAnnotations`: every text is a plain string */
export type ResolvedSchemaAnnotations<Output = unknown> = {
  title?: string
  description?: string
  guidelines?: string
  examples?: ExampleValue<Output>[]
  deprecated?: string
  readOnly?: boolean
}
export interface SanityObjectType<
  Output = OutputFromShape<SanityObjectShape>,
> extends SanityType<Output> {
  typeName: 'object'
  shape: SanityObjectShape
}

export interface SanityDocumentType<Output> extends SanityType<Output> {
  typeName: 'document'
  shape: SanityObjectShape
}

export type SanityAny = SanityType

export interface SanityString extends SanityType<string> {
  typeName: 'string'
}

export type NumberConstraints = {step?: number} & XOR<
  {min?: number; max?: number},
  {lt?: number; gt?: number}
>

export interface SanityNumber extends SanityType<number> {
  typeName: 'number'
  constraints?: NumberConstraints
}

export interface SanityBoolean extends SanityType<boolean> {
  typeName: 'boolean'
}
export interface SanityDateTime extends SanityType<string> {
  typeName: 'dateTime'
}
export interface SanityDate extends SanityType<string> {
  typeName: 'date'
}

export type SanityPrimitive =
  | SanityString
  | SanityNumber
  | SanityBoolean
  | SanityDate
  | SanityDateTime
  | SanityLiteral

export interface SanityNever extends SanityType<never> {
  typeName: 'never'
}

export interface SanityLiteral<
  Def extends boolean | string | number = boolean | string | number,
> extends SanityType<Def> {
  typeName: 'literal'
  value: Def
}

export type EnumInput = string[] | {[key: string]: string | number}

type EnumOutput<Def extends EnumInput> = Def extends (infer El)[]
  ? El extends string
    ? El
    : never
  : Def extends {[key: string]: string | number}
    ? Def[keyof Def]
    : never

export type NormalizedEnum<Def extends EnumInput> = Def extends string[]
  ? {[K in Def[number]]: K}
  : Def extends {[key: string]: string | number}
    ? Def
    : Def extends {[key: string]: string | number}
      ? Def
      : never

export interface SanityEnum<
  Def extends EnumInput = EnumInput,
  Output = EnumOutput<Def>,
> extends SanityType<Output> {
  typeName: 'enum'
  enum: NormalizedEnum<Def>
}

export interface SanityObjectUnion<
  Def extends SanityObjectUnionMemberKind =
    | SanityTypedObject
    | SanityReference
    | SanityBlock
    | SanityAsset
    | SanityNever,
> extends SanityType {
  typeName: 'union'
  union: Exclude<Def, SanityNever>[]
  output: OutputOf<Def>
  readonly '~standard': StandardProps<OutputOf<Def>>
}
export interface SanityPrimitiveUnion<
  Def extends SanityPrimitive | SanityLiteral | SanityNever =
    | SanityPrimitive
    | SanityLiteral
    | SanityNever,
> extends SanityType {
  typeName: 'primitiveUnion'
  union: Exclude<Def, SanityNever>[]
  output: OutputOf<Def>
  readonly '~standard': StandardProps<OutputOf<Def>>
}

export type SanityObjectShape = {[key in string]: SanityAny}

export type SanityNamedObjectShape = {
  _type: SanityLiteral<string>
}

export interface SanityObject<
  Shape extends SanityObjectShape = SanityObjectShape,
> extends SanityType {
  typeName: 'object'
  shape: Shape
  output: OutputFromShape<Shape>
  readonly '~standard': StandardProps<OutputFromShape<Shape>>
}

export type SanityBlockShape = SanityNamedObjectShape & {
  children?: SanityAny
}

export interface SanityBlock<
  Shape extends SanityBlockShape = SanityBlockShape,
> extends SanityType {
  typeName: 'block'
  shape: Shape
  output: OutputFromShape<Shape>
  readonly '~standard': StandardProps<OutputFromShape<Shape>>
}

export interface SanityImage<
  Shape extends SanityImageShape = SanityImageShape,
> extends SanityType {
  typeName: 'image'
  shape: Shape
  output: OutputFromShape<Shape>
  readonly '~standard': StandardProps<OutputFromShape<Shape>>
}

export interface SanityFile<
  Shape extends SanityFileShape = SanityFileShape,
> extends SanityType {
  typeName: 'file'
  shape: Shape
  output: OutputFromShape<Shape>
  readonly '~standard': StandardProps<OutputFromShape<Shape>>
}

export interface SanityLazy<T extends SanityType> extends SanityType {
  typeName: 'lazy'
  get: () => T
  output: OutputOf<T>
  readonly '~standard': StandardProps<OutputOf<T>>
}

export interface SanityReference<
  RefType extends SanityReferenceTarget = SanityReferenceTarget,
> extends SanityType<WithRefTypeDef<RefType>> {
  typeName: 'reference'
  referenceType: RefType

  shape: SanityReferenceShape
}

export interface SanityOptional<Type extends SanityType> extends SanityType {
  typeName: 'optional'
  type: Type
  output: OutputOf<Type> | undefined
  readonly '~standard': StandardProps<OutputOf<Type> | undefined>
}

/**
 * A schema that makes its field optional. Decided from the schema rather than
 * from its output (`undefined extends Output`), since reading the output of a
 * field declared with a getter would loop on recursive schemas.
 */
type OptionalFieldKind =
  | {typeName: 'optional'}
  | {typeName: 'lazy'; get: () => OptionalFieldKind}

/**
 * The output of an object shape: fields holding an {@link SanityOptional}
 * schema become optional properties.
 */
export type OutputFromShape<T extends SanityObjectShape> = Flatten<
  {
    -readonly [
      K in keyof T as T[K] extends OptionalFieldKind ? never : K
    ]: OutputOf<T[K]>
  } & {
    -readonly [
      K in keyof T as T[K] extends OptionalFieldKind ? K : never
    ]?: OutputOf<T[K]>
  }
>

export type AddArrayKey<T> = Flatten<T & {_key: string}>

export const SANITY_ASSET = ['image', 'file'] as const

export type SanityAsset = SanityImage | SanityFile

export const SANITY_OBJECT_LIKE = [
  'object',
  'document',
  'reference',
  'block',
  ...SANITY_ASSET,
] as const

export type SanityObjectLike =
  | SanityObject
  | SanityBlock
  | SanityReference<any>
  | SanityDocument
  | SanityAsset

export const SANITY_EXTENDABLE_OBJECT = [
  'object',
  'document',
  ...SANITY_ASSET,
] as const

export type SanityExtendableObject = Extract<
  SanityObjectLike,
  SanityObject | SanityDocument | SanityAsset
>

/**
 * An object schema with a `_type` literal. Matches on the shape rather than
 * the output so it also accepts recursive schemas, see the top of this file.
 */
export type SanityTypedObject = SanityType & {
  typeName: 'object'
  shape: {_type: SanityType<string>}
}

/** Constraint matching schemas by `typeName` only, see the top of this file */
export type SanityObjectLikeKind = SanityType & {
  typeName: (typeof SANITY_OBJECT_LIKE)[number]
}
/** Constraint matching schemas by `typeName` only, see the top of this file */
export type SanityObjectUnionKind = SanityType & {
  typeName: 'union'
  union: SanityObjectUnionMemberKind[]
}
/** Constraint matching any schema by `typeName` only, see the top of this file */
export type SanityKind = {typeName: string}
/** Constraint matching schemas by `typeName` only, see the top of this file */
export type SanityDocumentKind = SanityType & {typeName: 'document'}

/**
 * What a reference can point to: a document schema, or a schema annotated
 * with a document output type (`const Person: SanityType<Person> = ...`, the
 * way to declare recursive schemas with `lazy`)
 */
export type SanityReferenceTarget =
  | SanityDocumentKind
  | SanityType<SanityDocumentValue>

/**
 * Constraint for what Portable Text allows besides blocks and spans: the
 * `element` of `portableText()` and the `inline` and `annotation` options of
 * `block()`. Matches by `typeName`, and for objects by the `_type` field's
 * schema, never by output; see the top of this file.
 */
export type SanityPortableTextMember =
  | SanityTypedObject
  | (SanityType & {typeName: 'reference' | 'image' | 'file'})

/**
 * Constraint for the members of an object union. Matches by `typeName`, and
 * for objects by the `_type` field's schema, never by output; see the top of
 * this file.
 */
export type SanityObjectUnionMemberKind =
  | SanityTypedObject
  | (SanityType & {typeName: 'reference' | 'block' | 'image' | 'file'})
  | SanityNever

export type SanityArray<
  ElementType extends
    | (SanityObjectLikeKind | SanityObjectUnionKind)
    | (SanityPrimitive | SanityPrimitiveUnion),
> = ElementType extends SanityObjectLikeKind | SanityObjectUnionKind
  ? SanityObjectArray<ElementType>
  : ElementType extends SanityPrimitive | SanityPrimitiveUnion
    ? SanityPrimitiveArray<ElementType>
    : never
export interface SanityObjectArray<
  ElementType extends SanityObjectLikeKind | SanityObjectUnionKind =
    | SanityObjectLike
    | SanityObjectUnion,
> extends SanityType {
  typeName: 'objectArray'
  element: KeyedElement<ElementType>
  output: AddArrayKey<OutputOf<ElementType>>[]
  readonly '~standard': StandardProps<AddArrayKey<OutputOf<ElementType>>[]>
}

/**
 * The `element` of an object array: the given element schema with a `_key`
 * string field added (to each member, for a union), as `array()` copies it.
 * {@link SanityObjectArray}'s type parameter stays the schema it was given.
 */
export type KeyedElement<T extends SanityType> = T extends {typeName: 'never'}
  ? T
  : T extends {typeName: 'union'; union: (infer Member extends SanityType)[]}
    ? Flatten<
        Omit<T, 'union' | 'output' | '~standard'> & {
          union: KeyedElement<Member>[]
          output: AddArrayKey<OutputOf<T>>
          readonly '~standard': StandardProps<AddArrayKey<OutputOf<T>>>
        }
      >
    : T extends {shape: infer Shape}
      ? Flatten<
          Omit<T, 'shape' | 'output' | '~standard'> & {
            // Not `Omit`, which drops the known keys of a shape that also has
            // an index signature, like the default `SanityDocument` shape
            shape: Flatten<
              {
                [K in keyof Shape as K extends '_key' ? never : K]: Shape[K]
              } & {_key: SanityString}
            >
            output: AddArrayKey<OutputOf<T>>
            readonly '~standard': StandardProps<AddArrayKey<OutputOf<T>>>
          }
        >
      : T

export interface SanityPrimitiveArray<
  ElementType extends
    | SanityPrimitive
    | SanityLiteral
    | SanityPrimitiveUnion
    | SanityNever =
    | SanityPrimitive
    | SanityLiteral
    | SanityPrimitiveUnion
    | SanityNever,
> extends SanityType {
  typeName: 'primitiveArray'
  element: ElementType
  output: OutputOf<ElementType>[]
  readonly '~standard': StandardProps<OutputOf<ElementType>[]>
}

export interface _SanityDocument<
  Shape extends SanityDocumentShape = SanityDocumentShape,
  OutputShape extends SanityObjectShape = Shape,
> extends SanityType {
  typeName: 'document'
  shape: Shape
  output: OutputFromShape<OutputShape>
  readonly '~standard': StandardProps<OutputFromShape<OutputShape>>
}

export type SanityDocument<
  Shape extends SanityObjectShape = SanityObjectShape,
> = _SanityDocument<SanityDocumentShape & Shape, WithDocumentShape<Shape>>

/**
 * A document shape: the system fields, overridden by the fields of `Shape`
 * (as `document()` does at runtime)
 */
export type WithDocumentShape<Shape> = Flatten<
  Omit<SanityDocumentShape, keyof Shape> & Shape
>

/**
 * Key under which a reference value returned by `parse` holds the schema of
 * the document it points to. `parse` adds it as a getter that `JSON.stringify`
 * and `Object.keys` ignore. Values that did not come from `parse`, including
 * copies made with spread, do not have it, which is why it is part of
 * {@link Parsed} but stripped from {@link Infer}.
 */
export const REF_SCHEMA = '$refSchema' as const

export interface Conceal<T> {
  /** The schema of the referenced document. Only values returned by `parse` have it; see {@link REF_SCHEMA}. */
  [REF_SCHEMA]: T
}

export type WithRefTypeDef<RefType extends SanityReferenceTarget> = Flatten<
  ReferenceBase & Conceal<RefType>
>

/**
 * The type of a value returned by `parse`, `parseOrThrow` and the document
 * loaders. Same as {@link Infer}, except that reference values include the
 * schema of the document they point to under {@link REF_SCHEMA}, which is what
 * lets `loadReference` type and validate what it fetches.
 */
export type Parsed<T> = T extends () => infer R
  ? Parsed<R>
  : T extends SanityAny
    ? OutputOf<T>
    : T

type StripRefSchema<T> = T extends (infer Element)[]
  ? StripRefSchema<Element>[]
  : T extends object
    ? {
        [
          K in keyof T as K extends typeof REF_SCHEMA ? never : K
        ]: StripRefSchema<T[K]>
      }
    : T

/**
 * The type of a schema's value as it is stored: plain data, without the
 * {@link REF_SCHEMA} key that `parse` attaches to reference values. Use
 * {@link Parsed} for the type that `parse` returns.
 */
export type Infer<T> = StripRefSchema<Parsed<T>>

export type LiteralKeys<T extends SanityObjectShape> = {
  [
    K in keyof T as T[K] extends SanityLiteral | SanityObject | SanityDocument
      ? K
      : never
  ]: InferLiteralValue<T[K]>
} & OutputFormatFix

export type InferDeepLiteralValue<T extends SanityObjectShape> =
  LiteralKeys<T> & OutputFormatFix

export type InferLiteralValue<T extends SanityAny> =
  T extends SanityLiteral<infer Literal>
    ? Literal
    : T extends SanityObject<infer Shape extends SanityObjectShape>
      ? InferDeepLiteralValue<Shape>
      : T extends SanityDocument<infer Shape extends SanityObjectShape>
        ? InferDeepLiteralValue<Shape>
        : never

export type OutputOf<T extends SanityAny> = T['output']
