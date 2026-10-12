import {
  type BlockSchema,
  type NeverSchema,
  type ObjectArraySchema,
  type ObjectUnionSchema,
  type OutputOf,
  type PortableTextMemberKind,
  type SchemaAnnotations,
} from '../defs'
import {
  type AnnotationsError,
  type PortableTextOptionErrors,
} from '../helpers/schemaErrors'
import {array} from './array'
import {type FlattenUnionTypes, union} from './union'

type PortableText<
  BlockType extends BlockSchema,
  ElementType extends
    | PortableTextMemberKind
    | ObjectUnionSchema<PortableTextMemberKind>
    | NeverSchema,
> = ObjectArraySchema<
  ObjectUnionSchema<FlattenUnionTypes<BlockType | ElementType>>
>

export function portableText<
  const BlockType extends BlockSchema,
  const ElementType extends
    | PortableTextMemberKind
    | ObjectUnionSchema<PortableTextMemberKind>
    | NeverSchema,
>(
  options: {
    block: BlockType
    element: ElementType
  },
  annotations?: NoInfer<
    SchemaAnnotations<OutputOf<PortableText<BlockType, ElementType>>>
  >,
): PortableText<BlockType, ElementType>
// Matches only what the overload above rejects, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the options. TypeScript 6 lists every overload's error,
// ending with this one.
export function portableText<Options extends object>(
  options: Options & NoInfer<PortableTextOptionErrors<Options>>,
  annotations?: AnnotationsError<'portableText'>,
): never
export function portableText(
  options: {
    block: BlockSchema
    element:
      | PortableTextMemberKind
      | ObjectUnionSchema<PortableTextMemberKind>
      | NeverSchema
  },
  annotations?: any,
): unknown {
  return array(union([options.block, options.element]), annotations)
}
