import {
  type Flatten,
  type IsAny,
  type OutputFormatFix,
  type XOR,
} from './helpers/utilTypes'
import {
  type DocumentShape,
  type DocumentValue,
  type FileShape,
  type ImageShape,
  type ReferenceBase,
  type ReferenceShape,
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
 *   `typeName` (see the `*Kind` types) or compare against `Schema<any>`,
 *   which accepts any output without reading it.
 * - Output types computed eagerly. Declare a computed output as a member
 *   (`output: OutputFromShape<Shape>`), not as a type parameter with a default
 *   (`Output = OutputFromShape<Shape>`). TypeScript computes a member's type
 *   the first time something reads it, after the schema exists. It computes a
 *   default as soon as the type is used, and `object()` uses
 *   `ObjectSchema<Shape>` as its return type while the schema is still being
 *   inferred.
 *
 * TypeScript 7 still infers some schemas that break these rules, but
 * TypeScript 6 does not, so `pnpm typecheck:ts6` runs the type tests with
 * TypeScript 6.
 */
export interface Schema<Output = any> {
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
   * `any` when `Output` is `any`, so that `Schema` (the constraint every
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
export interface ObjectSchemaOf<
  Output = OutputFromShape<ObjectShape>,
> extends Schema<Output> {
  typeName: 'object'
  shape: ObjectShape
}

export interface DocumentSchemaOf<Output> extends Schema<Output> {
  typeName: 'document'
  shape: ObjectShape
}

export interface StringSchema extends Schema<string> {
  typeName: 'string'
}

export type NumberConstraints = {step?: number} & XOR<
  {min?: number; max?: number},
  {lt?: number; gt?: number}
>

export interface NumberSchema extends Schema<number> {
  typeName: 'number'
  constraints?: NumberConstraints
}

export interface BooleanSchema extends Schema<boolean> {
  typeName: 'boolean'
}
export interface DateTimeSchema extends Schema<string> {
  typeName: 'dateTime'
}
export interface DateSchema extends Schema<string> {
  typeName: 'date'
}

export type PrimitiveSchema =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | DateSchema
  | DateTimeSchema
  | LiteralSchema

export interface NeverSchema extends Schema<never> {
  typeName: 'never'
}

export interface LiteralSchema<
  Def extends boolean | string | number = boolean | string | number,
> extends Schema<Def> {
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

export interface EnumSchema<
  Def extends EnumInput = EnumInput,
  Output = EnumOutput<Def>,
> extends Schema<Output> {
  typeName: 'enum'
  enum: NormalizedEnum<Def>
}

export interface ObjectUnionSchema<
  Def extends ObjectUnionMemberKind =
    | TypedObjectSchema
    | ReferenceSchema
    | BlockSchema
    | AssetSchema
    | NeverSchema,
> extends Schema {
  typeName: 'union'
  union: Exclude<Def, NeverSchema>[]
  output: OutputOf<Def>
  readonly '~standard': StandardProps<OutputOf<Def>>
}
/**
 * A `union()` of documents: the target of a reference to several document
 * types, or the schema of a value that is one of several documents, such as
 * a query result. Members are documents or `lazy()` documents.
 */
export interface DocumentUnionSchema<
  Def extends DocumentUnionMemberKind = DocumentUnionMemberKind,
> extends Schema {
  typeName: 'documentUnion'
  union: Def[]
  output: OutputOf<Def>
  readonly '~standard': StandardProps<OutputOf<Def>>
}
export interface PrimitiveUnionSchema<
  Def extends PrimitiveSchema | LiteralSchema | NeverSchema =
    | PrimitiveSchema
    | LiteralSchema
    | NeverSchema,
> extends Schema {
  typeName: 'primitiveUnion'
  union: Exclude<Def, NeverSchema>[]
  output: OutputOf<Def>
  readonly '~standard': StandardProps<OutputOf<Def>>
}

export type ObjectShape = {[key in string]: Schema}

export type NamedObjectShape = {
  _type: LiteralSchema<string>
}

export interface ObjectSchema<
  Shape extends ObjectShape = ObjectShape,
> extends Schema {
  typeName: 'object'
  shape: Shape
  output: OutputFromShape<Shape>
  readonly '~standard': StandardProps<OutputFromShape<Shape>>
}

export type BlockShape = NamedObjectShape & {
  children?: Schema
}

export interface BlockSchema<
  Shape extends BlockShape = BlockShape,
> extends Schema {
  typeName: 'block'
  shape: Shape
  output: OutputFromShape<Shape>
  readonly '~standard': StandardProps<OutputFromShape<Shape>>
}

export interface ImageSchema<
  Shape extends ImageShape = ImageShape,
> extends Schema {
  typeName: 'image'
  shape: Shape
  output: OutputFromShape<Shape>
  readonly '~standard': StandardProps<OutputFromShape<Shape>>
}

export interface FileSchema<
  Shape extends FileShape = FileShape,
> extends Schema {
  typeName: 'file'
  shape: Shape
  output: OutputFromShape<Shape>
  readonly '~standard': StandardProps<OutputFromShape<Shape>>
}

export interface LazySchema<T extends Schema> extends Schema {
  typeName: 'lazy'
  get: () => T
  output: OutputOf<T>
  readonly '~standard': StandardProps<OutputOf<T>>
}

export interface ReferenceSchema<
  RefType extends ReferenceTargets = ReferenceTargets,
> extends Schema<WithRefTypeDef<RefType>> {
  typeName: 'reference'
  /**
   * The schema of the referenced document, or, for a reference to several
   * document types, a `union()` of their schemas
   */
  referenceType: RefType

  shape: ReferenceShape
}

export interface OptionalSchema<Type extends Schema> extends Schema {
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
 * The output of an object shape: fields holding an {@link OptionalSchema}
 * schema become optional properties.
 */
export type OutputFromShape<T extends ObjectShape> = Flatten<
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

export const ASSET_TYPE_NAMES = ['image', 'file'] as const

export type AssetSchema = ImageSchema | FileSchema

export const OBJECT_LIKE_TYPE_NAMES = [
  'object',
  'document',
  'reference',
  'block',
  ...ASSET_TYPE_NAMES,
] as const

export type ObjectLikeSchema =
  | ObjectSchema
  | BlockSchema
  | ReferenceSchema<any>
  | DocumentSchema
  | AssetSchema

export const EXTENDABLE_OBJECT_TYPE_NAMES = [
  'object',
  'document',
  ...ASSET_TYPE_NAMES,
] as const

export type ExtendableObjectSchema = Extract<
  ObjectLikeSchema,
  ObjectSchema | DocumentSchema | AssetSchema
>

/**
 * An object schema with a `_type` literal. Matches on the shape rather than
 * the output so it also accepts recursive schemas, see the top of this file.
 */
export type TypedObjectSchema = Schema & {
  typeName: 'object'
  shape: {_type: Schema<string>}
}

/** Constraint matching schemas by `typeName` only, see the top of this file */
export type ObjectLikeKind = Schema & {
  typeName: (typeof OBJECT_LIKE_TYPE_NAMES)[number]
}
/** Constraint matching schemas by `typeName` only, see the top of this file */
export type ObjectUnionKind = Schema & {
  typeName: 'union'
  union: ObjectUnionMemberKind[]
}
/** Constraint matching schemas by `typeName` only, see the top of this file */
export type DocumentUnionKind = Schema & {
  typeName: 'documentUnion'
  union: DocumentUnionMemberKind[]
}
/** Constraint matching any schema by `typeName` only, see the top of this file */
export type SchemaKind = {typeName: string}
/** Constraint matching schemas by `typeName` only, see the top of this file */
export type DocumentKind = Schema & {typeName: 'document'}

/**
 * What a reference can point to: a document schema, or a schema annotated
 * with a document output type (`const Person: Schema<Person> = ...`, the
 * way to declare recursive schemas with `lazy`)
 */
export type ReferenceTarget = DocumentKind | Schema<DocumentValue>

/**
 * What `reference()` accepts: one {@link ReferenceTarget}, or a
 * `union()` of documents for a reference to several document types
 */
export type ReferenceTargets = ReferenceTarget | DocumentUnionKind

/**
 * Constraint for the members of a {@link DocumentUnionSchema}. Matches by
 * `typeName`, never by output; see the top of this file.
 */
export type DocumentUnionMemberKind = DocumentKind | LazySchema<DocumentKind>

/**
 * Constraint for what Portable Text allows besides blocks and spans: the
 * `element` of `portableText()` and the `inline` and `annotation` options of
 * `block()`. Matches by `typeName`, and for objects by the `_type` field's
 * schema, never by output; see the top of this file.
 */
export type PortableTextMemberKind =
  | TypedObjectSchema
  | (Schema & {typeName: 'reference' | 'image' | 'file'})

/**
 * Constraint for the members of an object union. Matches by `typeName`, and
 * for objects by the `_type` field's schema, never by output; see the top of
 * this file.
 */
export type ObjectUnionMemberKind =
  | TypedObjectSchema
  | (Schema & {typeName: 'reference' | 'block' | 'image' | 'file'})
  | NeverSchema

export type ArraySchema<
  ElementType extends
    | (ObjectLikeKind | ObjectUnionKind)
    | (PrimitiveSchema | PrimitiveUnionSchema),
> = ElementType extends ObjectLikeKind | ObjectUnionKind
  ? ObjectArraySchema<ElementType>
  : ElementType extends PrimitiveSchema | PrimitiveUnionSchema
    ? PrimitiveArraySchema<ElementType>
    : never
export interface ObjectArraySchema<
  ElementType extends ObjectLikeKind | ObjectUnionKind =
    | ObjectLikeSchema
    | ObjectUnionSchema,
> extends Schema {
  typeName: 'objectArray'
  element: KeyedElement<ElementType>
  output: AddArrayKey<OutputOf<ElementType>>[]
  readonly '~standard': StandardProps<AddArrayKey<OutputOf<ElementType>>[]>
}

/**
 * The `element` of an object array: the given element schema with a `_key`
 * string field added (to each member, for a union), as `array()` copies it,
 * and `unkeyed`, the schema it was copied from. {@link ObjectArraySchema}'s
 * type parameter stays the schema it was given.
 */
export type KeyedElement<T extends Schema> = T extends {typeName: 'never'}
  ? T
  : // Already a keyed copy, which `array()` uses as is
    T extends {readonly unkeyed: Schema}
    ? T
    : T extends {typeName: 'union'; union: (infer Member extends Schema)[]}
      ? Flatten<
          Omit<T, 'union' | 'output' | '~standard'> & {
            union: KeyedElement<Member>[]
            output: AddArrayKey<OutputOf<T>>
            readonly '~standard': StandardProps<AddArrayKey<OutputOf<T>>>
            /** The schema this element was copied from, without `_key` */
            readonly unkeyed: T
          }
        >
      : T extends {shape: infer Shape}
        ? Flatten<
            Omit<T, 'shape' | 'output' | '~standard'> & {
              // Not `Omit`, which drops the known keys of a shape that also has
              // an index signature, like the default `DocumentSchema` shape
              shape: Flatten<
                {
                  [K in keyof Shape as K extends '_key' ? never : K]: Shape[K]
                } & {_key: StringSchema}
              >
              output: AddArrayKey<OutputOf<T>>
              readonly '~standard': StandardProps<AddArrayKey<OutputOf<T>>>
              /** The schema this element was copied from, without `_key` */
              readonly unkeyed: T
            }
          >
        : T

export interface PrimitiveArraySchema<
  ElementType extends
    | PrimitiveSchema
    | LiteralSchema
    | PrimitiveUnionSchema
    | NeverSchema =
    | PrimitiveSchema
    | LiteralSchema
    | PrimitiveUnionSchema
    | NeverSchema,
> extends Schema {
  typeName: 'primitiveArray'
  element: ElementType
  output: OutputOf<ElementType>[]
  readonly '~standard': StandardProps<OutputOf<ElementType>[]>
}

export interface _DocumentSchema<
  Shape extends DocumentShape = DocumentShape,
  OutputShape extends ObjectShape = Shape,
> extends Schema {
  typeName: 'document'
  shape: Shape
  output: OutputFromShape<OutputShape>
  readonly '~standard': StandardProps<OutputFromShape<OutputShape>>
}

export type DocumentSchema<Shape extends ObjectShape = ObjectShape> =
  _DocumentSchema<DocumentShape & Shape, WithDocumentShape<Shape>>

/**
 * A document shape: the system fields, overridden by the fields of `Shape`
 * (as `document()` does at runtime)
 */
export type WithDocumentShape<Shape> = Flatten<
  Omit<DocumentShape, keyof Shape> & Shape
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
  /** The schema of the referenced document, or a `union()` of the documents it may point to. Only values returned by `parse` have it; see {@link REF_SCHEMA}. */
  [REF_SCHEMA]: T
}

export type WithRefTypeDef<RefType extends ReferenceTargets> = Flatten<
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
  : T extends Schema
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

export type LiteralKeys<T extends ObjectShape> = {
  [
    K in keyof T as T[K] extends LiteralSchema | ObjectSchema | DocumentSchema
      ? K
      : never
  ]: InferLiteralValue<T[K]>
} & OutputFormatFix

export type InferDeepLiteralValue<T extends ObjectShape> = LiteralKeys<T> &
  OutputFormatFix

export type InferLiteralValue<T extends Schema> =
  T extends LiteralSchema<infer Literal>
    ? Literal
    : T extends ObjectSchema<infer Shape extends ObjectShape>
      ? InferDeepLiteralValue<Shape>
      : T extends DocumentSchema<infer Shape extends ObjectShape>
        ? InferDeepLiteralValue<Shape>
        : never

export type OutputOf<T extends Schema> = T['output']
