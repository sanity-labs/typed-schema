/**
 * Type-level checks that turn a schema rule violation into a `SchemaError`
 * saying what is wrong. Not exported from the package: the creators use them
 * in their signatures, and the type tests import them from here.
 *
 * Messages about an argument of one creator name the creator
 * (`array() elements ...`); messages about a field name the field
 * (`Field 'title' ...`), because the same field checks run in `object()`,
 * `document()`, `extend()`, `image()` and `file()`.
 */
import {
  type SanityAny,
  type SanityAsset,
  type SanityBlock,
  type SanityDocumentKind,
  type SanityKind,
  type SanityLiteral,
  type SanityNever,
  type SanityObjectLikeKind,
  type SanityObjectUnion,
  type SanityObjectUnionKind,
  type SanityPrimitive,
  type SanityPrimitiveUnion,
  type SanityReference,
  type SanityString,
  type SanityTypedObject,
} from '../defs'
import {type FieldNameError, type SchemaError} from './utilTypes'

// Fields

/**
 * The message {@link InvalidFieldNames} reports for `Property`, `never` if it
 * reports nothing
 */
type ReportedNameError<
  Property,
  Allowed extends string,
> = Property extends Allowed
  ? never
  : string extends Property
    ? never // index signature, e.g. a shape built at runtime
    : FieldNameError<Property & PropertyKey>

type FieldValueError<Property> = Property extends string | number
  ? `Field '${Property}' is not a schema`
  : 'Field values must be schemas'

/**
 * Maps every field name of `Shape` that is not a valid field name (and not in
 * `Allowed`) to a `SchemaError` saying why. Intersected with a shape
 * parameter, it rejects invalid names at the offending property, and the type
 * error shows the message. Wrap it in `NoInfer`: inferring `Shape` through it
 * reads fields declared with getters before the schema exists, and recursive
 * schemas collapse to `any`.
 */
export type InvalidFieldNames<Shape, Allowed extends string = never> = {
  [
    Property in keyof Shape as [ReportedNameError<Property, Allowed>] extends [
      never,
    ]
      ? never
      : Property
  ]: SchemaError<ReportedNameError<Property, Allowed>>
}

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

/**
 * `Shape` with every value replaced by `0` and `?` removed. A homomorphic
 * mapped type keeps the `readonly` modifier without reading the values.
 */
type ReadonlyModifiers<Shape> = {[Property in keyof Shape]-?: 0}

/** A schema, or `undefined` for an optional property */
type FieldSchemaKind = (SanityKind & {output: unknown}) | undefined

/**
 * Requires every field of `Shape` to be a schema, except fields declared with
 * getters and fields {@link InvalidFieldNames} rejects (two messages at one
 * field would reduce the expected type to `never`). Reading a getter's type
 * while `Shape` is inferred breaks recursive schemas, so those are told apart
 * by their modifier instead: a getter without a setter is a `readonly`
 * property, and checking that reads no values. Wrap it in `NoInfer`, like
 * {@link InvalidFieldNames}.
 *
 * Only fields that are not schemas are mapped. A schema is matched on having
 * `typeName` and `output` keys, so the type of `output` is never compared.
 * Mapping every field would intersect each schema with `SanityAny`, and
 * TypeScript 6 resolves the `output` of such an intersection, which reads
 * getters nested in the field (`cover: object({get related() {...}})`).
 *
 * The expected type includes `SanityAny` because the check cannot resolve for
 * a field whose type depends on a type parameter, such as `SanityArray<T>` in
 * a generic creator. Such a field is kept and must be assignable to the
 * expected type.
 */
type FieldSchemas<Shape, Allowed extends string> = {
  [
    Property in keyof Shape as [ReportedNameError<Property, Allowed>] extends [
      never,
    ]
      ? Equals<
          Pick<ReadonlyModifiers<Shape>, Property>,
          {-readonly [P in Property]: 0}
        > extends true
        ? Shape[Property] extends FieldSchemaKind
          ? never
          : Property
        : never
      : never
  ]: SanityAny | SchemaError<FieldValueError<Property>>
}

/**
 * Checks a shape parameter: field names must be valid (unless in `Allowed`)
 * and field values must be schemas. Each field that breaks a rule maps to a
 * `SchemaError` saying why. Wrap it in `NoInfer`, like
 * {@link InvalidFieldNames}.
 */
export type FieldErrors<
  Shape,
  Allowed extends string = never,
> = InvalidFieldNames<Shape, Allowed> & FieldSchemas<Shape, Allowed>

// document()

type SystemFieldError<Property, Field> = [Field] extends [
  SanityKind & {output: unknown},
]
  ? Property extends '_type'
    ? [Field] extends [SanityLiteral<string>]
      ? never
      : "document() field '_type' must be a string literal(), e.g. literal('post')"
    : [Field] extends [SanityLiteral<string> | SanityString]
      ? never
      : "document() field '_id' must be string() or a string literal()"
  : never // not a schema, reported by `FieldErrors`

/**
 * Requires a `_type` field holding a string `literal()`, and an `_id` field, if
 * given, holding `string()` or a string `literal()`. Each violation maps the
 * field to a `SchemaError`. Checked here rather than by intersecting the
 * shape with the expected schemas, because `SanityString & SanityLiteral`
 * reduces to `never` and the type error would not say what is wrong.
 */
export type SystemFieldErrors<Shape> = {
  [
    Property in keyof Shape & ('_id' | '_type') as [
      SystemFieldError<Property, Shape[Property]>,
    ] extends [never]
      ? never
      : Property
  ]: SchemaError<SystemFieldError<Property, Shape[Property]>>
}

/** Requires a `_type` field, with a `SchemaError` saying so if missing */
export type RequireTypeField<Shape> = '_type' extends keyof Shape
  ? unknown
  : {
      _type: SchemaError<"document() needs a _type field, e.g. _type: literal('post')">
    }

// Annotations

/**
 * The message for a call that reaches a creator's catch-all overload with a
 * valid first argument. The overloads before the catch-all type `examples`
 * against the schema's value type, so what the catch-all rejects in that case
 * is the annotations.
 */
export type InvalidAnnotations<Creator extends string> =
  `${Creator}() annotations are invalid: examples must be values of the schema and keys must be title, description, guidelines, examples, deprecated or readOnly`

/**
 * The `annotations` parameter of a creator's catch-all overload. TypeScript
 * reports the first argument that fails, so the user sees this message only
 * when the first parameter accepts the argument, as `union()`'s does for valid
 * members. The other creators resolve their first parameter's message to
 * {@link InvalidAnnotations} for a valid argument instead.
 */
export type AnnotationsError<Creator extends string> = SchemaError<
  InvalidAnnotations<Creator>
>

// array()

type ValidArrayElement =
  | SanityObjectLikeKind
  | SanityObjectUnionKind
  | SanityPrimitive
  | SanityPrimitiveUnion
  | SanityNever

/**
 * Says why `Def` cannot be an `array()` element, or, for a valid element,
 * that the annotations are what the catch-all overload rejects
 */
export type ArrayElementError<Def> = Def extends {
  typeName: 'objectArray' | 'primitiveArray'
}
  ? 'array() elements cannot be arrays. Wrap the inner array in an object'
  : Def extends {typeName: 'optional'}
    ? 'array() elements cannot be optional'
    : Def extends ValidArrayElement
      ? InvalidAnnotations<'array'>
      : 'array() elements must be objects, primitives, references, blocks, images, files or unions of these'

/** Like {@link ArrayElementError}, for `objectArray()` */
export type ObjectArrayElementError<Def> = Def extends
  | SanityObjectLikeKind
  | SanityObjectUnionKind
  ? InvalidAnnotations<'objectArray'>
  : 'objectArray() elements must be objects, references, blocks, images, files or unions of these'

/** Like {@link ArrayElementError}, for `primitiveArray()` */
export type PrimitiveArrayElementError<Def> = Def extends
  | SanityPrimitive
  | SanityLiteral
  | SanityPrimitiveUnion
  | SanityNever
  ? InvalidAnnotations<'primitiveArray'>
  : 'primitiveArray() elements must be primitives, literals or unions of these'

// reference()

/**
 * Says why `Def` cannot be a `reference()` target, or, for a valid target,
 * that the annotations are what the catch-all overload rejects
 */
export type ReferenceTargetError<Def> = Def extends SanityDocumentKind
  ? InvalidAnnotations<'reference'>
  : 'reference() target must be a document schema'

// union()

type ObjectUnionMember =
  | SanityTypedObject
  | SanityReference
  | SanityBlock
  | SanityAsset
  | SanityObjectUnion<any>

type PrimitiveUnionMember =
  | SanityPrimitive
  | SanityLiteral
  | SanityPrimitiveUnion<any>

type UnionMemberError<Member> = Member extends
  | SanityNever
  | ObjectUnionMember
  | PrimitiveUnionMember
  ? never
  : Member extends {typeName: 'object'}
    ? "union() members that are objects need a _type literal field, e.g. _type: literal('link')"
    : 'union() members must be primitives, literals, typed objects, references, blocks, images or files'

/**
 * `Member` intersected with a `SchemaError` saying why it cannot be in a
 * union, or `Member` as is if it can
 */
type CheckUnionMember<Member> = Member extends unknown
  ? [UnionMemberError<Member>] extends [never]
    ? Member
    : Member & SchemaError<UnionMemberError<Member>>
  : never

type MemberKind<Member> = Member extends ObjectUnionMember
  ? 'object'
  : Member extends PrimitiveUnionMember
    ? 'primitive'
    : never

type FirstKind<Members> = Members extends readonly [infer Member, ...infer Rest]
  ? [MemberKind<Member>] extends [never]
    ? FirstKind<Rest>
    : MemberKind<Member>
  : never

type MixedKinds = 'union() members cannot mix primitive types and object types'

/**
 * Checks each member of a tuple. The first member whose kind (primitive or
 * object) differs from the members before it gets a `SchemaError`, and
 * checking stops there, so the catch-all overload fails with one error, like
 * the overloads above it. TypeScript 6 then lists every overload's error,
 * this one included. With more errors here than in another overload, it would
 * show only that other overload's error.
 */
type CheckUnionTuple<Members, Kind> = Members extends readonly [
  infer Member,
  ...infer Rest,
]
  ? [MemberKind<Member>] extends [Kind]
    ? [CheckUnionMember<Member>, ...CheckUnionTuple<Rest, Kind>]
    : [Member & SchemaError<MixedKinds>, ...Rest]
  : []

/**
 * The expected type of the members passed to `union()`: each member left as is
 * if it can be in the union, or intersected with a `SchemaError` saying
 * why not. For an array that is not a tuple, mixing primitives and objects is
 * reported on the whole array.
 */
export type CheckUnionMembers<Members extends readonly unknown[]> =
  number extends Members['length']
    ? [Extract<Members[number], ObjectUnionMember>] extends [never]
      ? {[Index in keyof Members]: CheckUnionMember<Members[Index]>}
      : [Extract<Members[number], PrimitiveUnionMember>] extends [never]
        ? {[Index in keyof Members]: CheckUnionMember<Members[Index]>}
        : SchemaError<MixedKinds>
    : CheckUnionTuple<Members, FirstKind<Members>>

// Options objects

/**
 * Each option of `Options` with an error, mapped to a `SchemaError` with it.
 * If no option has one, the whole options object is `SchemaError<Fallback>`,
 * so a catch-all overload never accepts a call the overloads before it reject.
 * The fallback also covers a call with valid options and invalid annotations:
 * the options are the first argument, so their error is the one reported.
 */
type OptionErrors<
  Options,
  ErrorOf extends {[Option in keyof Options]: string},
  Fallback extends string,
> = {
  [
    Option in keyof Options as [ErrorOf[Option]] extends [never]
      ? never
      : Option
  ]: SchemaError<ErrorOf[Option]>
} extends infer Errors
  ? [keyof Errors] extends [never]
    ? SchemaError<Fallback>
    : Errors
  : never

type BlockOptionError<Option, Value> = [Value] extends [undefined]
  ? never
  : Option extends 'style' | 'list' | 'decorator'
    ? [Value] extends [
        | SanityLiteral<string>
        | SanityPrimitiveUnion<SanityLiteral<string>>
        | undefined,
      ]
      ? never
      : `block() option '${Option}' must be a string literal() or a union() of string literals`
    : Option extends 'inline' | 'annotation'
      ? [Value] extends [
          SanityTypedObject | SanityObjectUnion<SanityTypedObject> | undefined,
        ]
        ? never
        : `block() option '${Option}' must be a typed object or a union() of typed objects`
      : Option extends '_type'
        ? [Value] extends [SanityLiteral<string> | undefined]
          ? never
          : "block() option '_type' must be a string literal()"
        : `'${Option & string}' is not a block() option`

/**
 * Each option of `Options` that `block()` rejects, mapped to a `SchemaError`
 */
export type BlockOptionErrors<Options> = OptionErrors<
  Options,
  {[Option in keyof Options]: BlockOptionError<Option, Options[Option]>},
  'Invalid block() options or annotations'
>

type PortableTextOptionError<Option, Value> = Option extends 'block'
  ? [Value] extends [SanityBlock]
    ? never
    : "portableText() option 'block' must be a block() schema"
  : Option extends 'element'
    ? [Value] extends [
        SanityTypedObject | SanityObjectUnion<SanityTypedObject> | SanityNever,
      ]
      ? never
      : "portableText() option 'element' must be a typed object, a union() of typed objects or never()"
    : `'${Option & string}' is not a portableText() option`

/**
 * Each option of `Options` that `portableText()` rejects, mapped to a
 * `SchemaError`
 */
export type PortableTextOptionErrors<Options> = OptionErrors<
  Options,
  {
    [Option in keyof Options]: PortableTextOptionError<Option, Options[Option]>
  },
  "Invalid portableText() options or annotations: it needs a 'block' and an 'element' option"
>
