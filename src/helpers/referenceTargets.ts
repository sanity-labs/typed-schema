import {
  isDocumentSchema,
  isDocumentUnionSchema,
  isLazySchema,
  isLiteralSchema,
} from '../asserters'
import {type ObjectSchema, type Schema} from '../defs'

/**
 * The target schemas of a reference: the schema given to `reference()`, or
 * the members of the `union()` of documents given to it, with nested unions
 * flattened. Lazy targets are returned unresolved.
 */
export function listReferenceTargets(referenceType: Schema): Schema[] {
  return isDocumentUnionSchema(referenceType)
    ? referenceType.union.flatMap(listReferenceTargets)
    : [referenceType]
}

/** The `_type` literal of a document schema, if it has one */
export function documentTypeOf(schema: Schema): string | undefined {
  const typeLiteral = (schema as ObjectSchema).shape?._type
  return typeLiteral && isLiteralSchema(typeLiteral)
    ? String(typeLiteral.value)
    : undefined
}

/**
 * Throws if a target is not a document schema, such as an object typed by its
 * value as `Schema<Value>`, which the types accept as a target. Lazy
 * targets are skipped, since resolving them here would break schemas that
 * reference themselves.
 */
export function assertDocumentTargets(targets: readonly Schema[]) {
  for (const target of targets) {
    if (!isLazySchema(target) && !isDocumentSchema(target)) {
      throw new Error(
        `reference() target must be a document schema, got ${target.typeName}`,
      )
    }
  }
}

/**
 * Throws if two different targets of a `reference()` have the same `_type`
 * literal: the loader picks the target by the `_type` of the loaded document,
 * so it could not tell them apart. Lazy targets are skipped, since resolving
 * them here would break schemas that reference themselves; the loader checks
 * them once resolved.
 */
export function assertDistinctTargetTypes(targets: readonly Schema[]) {
  const seen = new Map<string, Schema>()
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
