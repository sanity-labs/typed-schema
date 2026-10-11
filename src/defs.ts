import {type Flatten, type OutputFormatFix, type XOR} from './helpers/utilTypes'
import {
  type ReferenceBase,
  type SanityDocumentShape,
  type SanityDocumentValue,
  type SanityFileShape,
  type SanityImageShape,
  type SanityReferenceShape,
} from './shapeDefs'

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
   * @deprecated ** DO NOT USE ** This will throw an error if you try to access it at runtime
   */
  output: Output
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
}

export interface SanityImage<
  Shape extends SanityImageShape = SanityImageShape,
> extends SanityType {
  typeName: 'image'
  shape: Shape
  output: OutputFromShape<Shape>
}

export interface SanityFile<
  Shape extends SanityFileShape = SanityFileShape,
> extends SanityType {
  typeName: 'file'
  shape: Shape
  output: OutputFromShape<Shape>
}

export interface SanityLazy<T extends SanityType> extends SanityType {
  typeName: 'lazy'
  get: () => T
  output: OutputOf<T>
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

/** Constraint for the members of an object union */
export type SanityObjectUnionMemberKind =
  | SanityTypedObject
  | (SanityType & {typeName: 'reference' | 'block' | 'image' | 'file'})
  | SanityNever

export type SanityArray<
  ElementType extends
    | (SanityObjectLike | SanityObjectUnion)
    | (SanityPrimitive | SanityPrimitiveUnion),
> = ElementType extends SanityObjectLike | SanityObjectUnion
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
  element: ElementType
  output: AddArrayKey<OutputOf<ElementType>>[]
}

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
}

export interface _SanityDocument<
  Shape extends SanityDocumentShape = SanityDocumentShape,
  OutputShape extends SanityObjectShape = Shape,
> extends SanityType {
  typeName: 'document'
  shape: Shape
  output: OutputFromShape<OutputShape>
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
 * The type of a value returned by `parse`, `safeParse` and the document
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
