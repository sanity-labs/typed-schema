import {
  type SanityBlock,
  type SanityLiteral,
  type SanityNever,
  type SanityNumber,
  type SanityObject,
  type SanityObjectArray,
  type SanityObjectUnion,
  type SanityOptional,
  type SanityPrimitiveArray,
  type SanityPrimitiveUnion,
  type SanityString,
  type SanityTypedObject,
} from '../defs'
import {defineType} from '../helpers/defineType'
import {type BlockOptionErrors} from '../helpers/schemaErrors'
import {array} from './array'
import {literal} from './literal'
import {never} from './never'
import {number} from './number'
import {object} from './object'
import {optional} from './optional'
import {string} from './string'
import {
  type FlattenPrimitiveUnionTypes,
  type FlattenUnionTypes,
  union,
} from './union'

type Configured<T, Fallback> = [T] extends [SanityNever] ? Fallback : T

/**
 * The schema of a Portable Text span. `marks` holds decorator names and the
 * `_key`s of entries in the block's `markDefs`, so it is a plain string array.
 */
export type SpanObjectShape<
  DecoratorType extends
    | SanityNever
    | SanityLiteral<string>
    | SanityPrimitiveUnion<SanityLiteral<string>>,
> = {
  _type: SanityLiteral<'span'>
  marks: SanityPrimitiveArray<
    [DecoratorType] extends [SanityNever]
      ? SanityString
      : SanityPrimitiveUnion<
          FlattenPrimitiveUnionTypes<DecoratorType> | SanityString
        >
  >
  text: SanityString
}

/**
 * The shape of a Portable Text block as stored by Sanity: `style`, `listItem`
 * and `level` are optional, `children` always present, `markDefs` optional.
 * Unconfigured `style`/`listItem` accept any string.
 */
export type BlockObjectShape<
  StyleType extends
    | SanityNever
    | SanityLiteral<string>
    | SanityPrimitiveUnion<SanityLiteral<string>>,
  ListType extends
    | SanityNever
    | SanityLiteral<string>
    | SanityPrimitiveUnion<SanityLiteral<string>>,
  InlineType extends
    | SanityNever
    | SanityTypedObject
    | SanityObjectUnion<SanityTypedObject>,
  DecoratorType extends
    | SanityNever
    | SanityLiteral<string>
    | SanityPrimitiveUnion<SanityLiteral<string>>,
  AnnotationType extends
    | SanityNever
    | SanityTypedObject
    | SanityObjectUnion<SanityTypedObject>,
  TypeName extends SanityLiteral<string> = SanityLiteral<'block'>,
> = {
  _type: TypeName
  style: SanityOptional<Configured<StyleType, SanityString>>
  listItem: SanityOptional<Configured<ListType, SanityString>>
  level: SanityOptional<SanityNumber>
  children: SanityObjectArray<
    SanityObjectUnion<
      | FlattenUnionTypes<InlineType>
      | SanityObject<SpanObjectShape<DecoratorType>>
    >
  >
  markDefs: SanityOptional<
    [AnnotationType] extends [SanityNever]
      ? SanityPrimitiveArray<SanityNever>
      : SanityObjectArray<Exclude<AnnotationType, SanityNever>>
  >
}

export type BlockOptions<
  StyleType extends
    | void
    | SanityLiteral<string>
    | SanityPrimitiveUnion<SanityLiteral<string>> = never,
  ListType extends
    | void
    | SanityLiteral<string>
    | SanityPrimitiveUnion<SanityLiteral<string>> = never,
  InlineType extends
    | void
    | SanityTypedObject
    | SanityObjectUnion<SanityTypedObject> = never,
  DecoratorType extends
    | void
    | SanityLiteral<string>
    | SanityPrimitiveUnion<SanityLiteral<string>> = never,
  AnnotationType extends
    | void
    | SanityTypedObject
    | SanityObjectUnion<SanityTypedObject> = never,
  TypeName extends SanityLiteral<string> = SanityLiteral<'block'>,
> = {
  _type?: TypeName
  /** Allowed block styles, e.g. `union([literal('normal'), literal('h1')])`. Any string if omitted. */
  style?: StyleType
  /** Allowed list item types, e.g. `union([literal('bullet'), literal('number')])`. Any string if omitted. */
  list?: ListType
  /**
   * Decorator names for span marks, e.g. `union([literal('strong'), literal('em')])`.
   *
   * Marks also hold the `_key`s of entries in `markDefs`, which are arbitrary
   * strings, so the inferred `marks` type is always `string[]` and parsing
   * accepts any string. The option is kept for Studio schema generation.
   */
  decorator?: DecoratorType
  /** Typed objects allowed inline among the spans */
  inline?: InlineType
  /** Typed objects allowed in `markDefs` (annotations referenced from span marks by `_key`) */
  annotation?: AnnotationType
}

export type VoidNever<T> = void extends T ? SanityNever : Exclude<T, void>

/**
 * A Portable Text block. Use together with `portableText()` to declare a
 * rich text field.
 */
export function block<
  StyleType extends
    | void
    | SanityLiteral<string>
    | SanityPrimitiveUnion<SanityLiteral<string>>,
  ListType extends
    | void
    | SanityLiteral<string>
    | SanityPrimitiveUnion<SanityLiteral<string>>,
  InlineType extends
    | void
    | SanityTypedObject
    | SanityObjectUnion<SanityTypedObject>,
  DecoratorType extends
    | void
    | SanityLiteral<string>
    | SanityPrimitiveUnion<SanityLiteral<string>>,
  AnnotationType extends
    | void
    | SanityTypedObject
    | SanityObjectUnion<SanityTypedObject>,
  TypeName extends SanityLiteral<string> = SanityLiteral<'block'>,
>(
  options: BlockOptions<
    StyleType,
    ListType,
    InlineType,
    DecoratorType,
    AnnotationType,
    TypeName
  >,
): SanityBlock<
  BlockObjectShape<
    VoidNever<StyleType>,
    VoidNever<ListType>,
    VoidNever<InlineType>,
    VoidNever<DecoratorType>,
    VoidNever<AnnotationType>,
    TypeName
  >
>
// Matches only what the overload above rejects, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the options. TypeScript 6 lists every overload's error,
// ending with this one.
export function block<Options extends object>(
  options: Options & NoInfer<BlockOptionErrors<Options>>,
): never
export function block(
  options: BlockOptions<any, any, any, any, any, any>,
): SanityBlock {
  const Marks = options.decorator
    ? array(union([options.decorator, string()]))
    : array(string())

  const Span = object({
    _type: literal('span'),
    marks: Marks,
    text: string(),
  })
  return defineType({
    typeName: 'block',
    shape: {
      _type: options._type || literal('block'),
      style: optional(options.style || string()),
      listItem: optional(options.list || string()),
      level: optional(number()),
      children: array(union([Span, options.inline || never()])),
      markDefs: optional(
        options.annotation ? array(options.annotation) : array(never()),
      ),
    },
  }) as any
}
