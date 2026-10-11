import {isLazySchema, isLiteralSchema} from '../asserters'
import {type SanityObject, type SanityType} from '../defs'

/** The `_type` literal of a document schema, if it has one */
export function documentTypeOf(schema: SanityType): string | undefined {
  const typeLiteral = (schema as SanityObject).shape?._type
  return typeLiteral && isLiteralSchema(typeLiteral)
    ? String(typeLiteral.value)
    : undefined
}

/**
 * Throws if two different targets of a `reference()` have the same `_type`
 * literal: the loader picks the target by the `_type` of the loaded document,
 * so it could not tell them apart. Lazy targets are skipped, since resolving
 * them here would break schemas that reference themselves; the loader checks
 * them once resolved.
 */
export function assertDistinctTargetTypes(targets: readonly SanityType[]) {
  const seen = new Map<string, SanityType>()
  for (const target of targets) {
    if (isLazySchema(target)) continue
    const type = documentTypeOf(target)
    if (type === undefined) continue
    const other = seen.get(type)
    if (other !== undefined && other !== target) {
      throw new Error(
        `reference() targets must have different _type literals, but more than one has _type "${type}"`,
      )
    }
    seen.set(type, target)
  }
}
