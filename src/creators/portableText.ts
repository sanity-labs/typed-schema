import {
  type SanityBlock,
  type SanityNever,
  type SanityObjectArray,
  type SanityObjectUnion,
  type SanityTypedObject,
} from '../defs'
import {type PortableTextOptionErrors} from '../helpers/schemaErrors'
import {array} from './array'
import {type FlattenUnionTypes, union} from './union'

type PortableText<
  BlockType extends SanityBlock,
  ElementType extends
    | SanityTypedObject
    | SanityObjectUnion<SanityTypedObject>
    | SanityNever,
> = SanityObjectArray<
  SanityObjectUnion<FlattenUnionTypes<BlockType | ElementType>>
>

export function portableText<
  const BlockType extends SanityBlock,
  const ElementType extends
    | SanityTypedObject
    | SanityObjectUnion<SanityTypedObject>
    | SanityNever,
>(options: {
  block: BlockType
  element: ElementType
}): PortableText<BlockType, ElementType>
// Matches only what the overload above rejects, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the options. TypeScript 6 lists every overload's error,
// ending with this one.
export function portableText<Options extends object>(
  options: Options & NoInfer<PortableTextOptionErrors<Options>>,
): never
export function portableText(options: {
  block: SanityBlock
  element:
    | SanityTypedObject
    | SanityObjectUnion<SanityTypedObject>
    | SanityNever
}): unknown {
  return array(union([options.block, options.element]))
}
