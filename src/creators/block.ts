import {
  type OutputOf,
  type BlockSchema,
  type LiteralSchema,
  type NeverSchema,
  type NumberSchema,
  type ObjectSchema,
  type ObjectArraySchema,
  type ObjectUnionSchema,
  type OptionalSchema,
  type PrimitiveArraySchema,
  type PortableTextMemberKind,
  type PrimitiveUnionSchema,
  type StringSchema,
  type SchemaAnnotations,
} from '../defs'
import {defineType} from '../helpers/defineType'
import {
  type AnnotationsError,
  type BlockOptionErrors,
} from '../helpers/schemaErrors'
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

type Configured<T, Fallback> = [T] extends [never] ? Fallback : T

/**
 * The schema of a Portable Text span. `marks` holds decorator names and the
 * `_key`s of entries in the block's `markDefs`, so it is a plain string array.
 */
export type SpanObjectShape<
  DecoratorType extends
    | NeverSchema
    | LiteralSchema<string>
    | PrimitiveUnionSchema<LiteralSchema<string>>,
> = {
  _type: LiteralSchema<'span'>
  marks: PrimitiveArraySchema<
    [DecoratorType] extends [NeverSchema]
      ? StringSchema
      : PrimitiveUnionSchema<
          FlattenPrimitiveUnionTypes<DecoratorType> | StringSchema
        >
  >
  text: StringSchema
}

/** The options `block()` accepts */
export interface BlockOptions {
  /** The block's `_type`, e.g. `literal('textBlock')`. `'block'` if omitted. */
  _type?: LiteralSchema<string>
  /** Allowed block styles, e.g. `union([literal('normal'), literal('h1')])`. Any string if omitted. */
  style?: LiteralSchema<string> | PrimitiveUnionSchema<LiteralSchema<string>>
  /** Allowed list item types, e.g. `union([literal('bullet'), literal('number')])`. Any string if omitted. */
  list?: LiteralSchema<string> | PrimitiveUnionSchema<LiteralSchema<string>>
  /**
   * Decorator names for span marks, e.g. `union([literal('strong'), literal('em')])`.
   *
   * Marks also hold the `_key`s of entries in `markDefs`, which are arbitrary
   * strings, so the inferred `marks` type is always `string[]` and parsing
   * accepts any string. The option is kept for Studio schema generation.
   */
  decorator?:
    | LiteralSchema<string>
    | PrimitiveUnionSchema<LiteralSchema<string>>
  /** Typed objects, references, images or files allowed inline among the spans */
  inline?: PortableTextMemberKind | ObjectUnionSchema<PortableTextMemberKind>
  /** Typed objects, references, images or files allowed in `markDefs` (annotations, which span marks refer to by `_key`) */
  annotation?:
    | PortableTextMemberKind
    | ObjectUnionSchema<PortableTextMemberKind>
}

/** The schema given for `Name` in `Options`, or `never` if it is left out */
type Option<
  Options extends BlockOptions,
  Name extends keyof BlockOptions,
> = Exclude<Options[Name & keyof Options], undefined>

/**
 * The shape of a Portable Text block as stored by Sanity: `style`, `listItem`
 * and `level` are optional, `children` always present, `markDefs` optional.
 * Unconfigured `style`/`listItem` accept any string.
 */
export type BlockObjectShape<Options extends BlockOptions = BlockOptions> = {
  _type: Configured<Option<Options, '_type'>, LiteralSchema<'block'>>
  style: OptionalSchema<Configured<Option<Options, 'style'>, StringSchema>>
  listItem: OptionalSchema<Configured<Option<Options, 'list'>, StringSchema>>
  level: OptionalSchema<NumberSchema>
  children: ObjectArraySchema<
    ObjectUnionSchema<
      | FlattenUnionTypes<Option<Options, 'inline'>>
      | ObjectSchema<SpanObjectShape<Option<Options, 'decorator'>>>
    >
  >
  markDefs: OptionalSchema<
    [Option<Options, 'annotation'>] extends [never]
      ? PrimitiveArraySchema<NeverSchema>
      : ObjectArraySchema<Option<Options, 'annotation'>>
  >
}

/** The keys of `Options` that are not `block()` options */
type UnknownOptions<Options> = {
  [Key in Exclude<keyof Options, keyof BlockOptions>]: never
}

/**
 * A Portable Text block. Use together with `portableText()` to declare a
 * rich text field.
 */
export function block<Options extends BlockOptions>(
  options: Options & UnknownOptions<Options>,
  annotations?: NoInfer<
    SchemaAnnotations<OutputOf<BlockSchema<BlockObjectShape<Options>>>>
  >,
): BlockSchema<BlockObjectShape<Options>>
// Matches only what the overload above rejects, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the options. TypeScript 6 lists every overload's error,
// ending with this one.
export function block<Options extends object>(
  options: Options & NoInfer<BlockOptionErrors<Options>>,
  annotations?: AnnotationsError<'block'>,
): never
export function block(options: BlockOptions, annotations?: any): BlockSchema {
  const Marks = options.decorator
    ? array(union([options.decorator, string()]))
    : array(string())

  const Span = object({
    _type: literal('span'),
    marks: Marks,
    text: string(),
  })
  return defineType(
    {
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
    },
    annotations,
  ) as any
}
