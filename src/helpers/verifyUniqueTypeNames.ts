import {
  isBlockSchema,
  isDocumentSchema,
  isFileSchema,
  isImageSchema,
  isNeverSchema,
  isObjectArraySchema,
  isObjectSchema,
  isObjectUnionSchema,
  isOptionalSchema,
} from '../asserters'
import {getInstanceName} from '../content-utils/getInstanceName'
import {getUnkeyedSchema} from '../creators/array'
import {type SanityObjectShape, type SanityType} from '../defs'
import {FileBase, ImageBase} from '../shapeDefs'
import {getLazySchema} from './getLazySchema'

export class DuplicateTypeNameError extends Error {
  constructor(
    message: string,
    public duplicates: TypeNameInfo[],
  ) {
    super(message)
  }
}

/**
 * Returns `schema` unchanged, or throws a `DuplicateTypeNameError` if two
 * different schemas declare the same `_type`. Reusing one schema in several
 * places is fine; two declarations of one `_type` are rejected even if their
 * shapes are identical, so each type has one definition.
 */
export function verifyUniqueTypeNames<S extends SanityType>(schema: S): S {
  const duplicates = [...walk(schema).values()]
    .filter(found => found.schemas.size > 1)
    .map(({name, paths}) => ({name, paths}))
  if (duplicates.length === 0) {
    return schema
  }
  throw new DuplicateTypeNameError(
    `Duplicate type names in schema: ${duplicates
      .map(
        dupe =>
          `_type "${dupe.name}" at ${dupe.paths
            .map(p => (p.length === 0 ? '(root)' : p.join(' -> ')))
            .join(', ')}`,
      )
      .join('\n')}`,
    duplicates,
  )
}

interface TypeNameInfo {
  name: string
  paths: string[][]
}

interface FoundTypeName extends TypeNameInfo {
  schemas: Set<SanityType>
}

/**
 * Lists every `_type` declared in `schema` with the paths where it appears,
 * including reuses of the same schema
 */
export function collectTypeNames<S extends SanityType>(
  schema: S,
): Record<string, TypeNameInfo> {
  return Object.fromEntries(
    [...walk(schema).entries()].map(([name, {paths}]) => [name, {name, paths}]),
  )
}

function walk(schema: SanityType): Map<string, FoundTypeName> {
  const found = new Map<string, FoundTypeName>()
  // Schemas on the current path: a schema that contains itself (through a
  // getter field or `lazy`) is recorded where it recurs but not walked again
  const ancestors = new Set<SanityType>()

  function visit(node: SanityType, path: string[]): void {
    const current = getLazySchema(node)
    // Array elements are copies with `_key` added, identified by their source
    const identity = getUnkeyedSchema(current)
    if (isObjectSchema(current) || isDocumentSchema(current)) {
      const name = getInstanceName(current)
      if (name) {
        const entry = found.get(name)
        if (entry) {
          entry.paths.push(path)
          entry.schemas.add(identity)
        } else {
          found.set(name, {name, paths: [path], schemas: new Set([identity])})
        }
      }
    }
    if (ancestors.has(identity)) {
      return
    }
    ancestors.add(identity)
    visitChildren(current, path)
    ancestors.delete(identity)
  }

  function visitChildren(current: SanityType, path: string[]): void {
    if (isOptionalSchema(current)) {
      visit(current.type, path)
    } else if (isObjectArraySchema(current)) {
      visit(current.element, path)
    } else if (isObjectUnionSchema(current)) {
      for (const member of current.union) {
        visitUnionMember(member, path)
      }
    } else if (isObjectSchema(current) || isDocumentSchema(current)) {
      for (const [key, field] of Object.entries(current.shape)) {
        visit(field, [...path, key])
      }
    } else if (isImageSchema(current) || isFileSchema(current)) {
      // `image` and `file` are built-in types and every `image()`/`file()`
      // call creates its own, so only the custom fields are walked
      const base: Record<string, SanityType> = isImageSchema(current)
        ? ImageBase.shape
        : FileBase.shape
      for (const [key, field] of Object.entries(current.shape)) {
        if (field !== base[key]) {
          visit(field, [...path, key])
        }
      }
    } else if (isBlockSchema(current)) {
      // Like `image`, `block` and its `span` are built in and created by each
      // `block()` call, so only the inline and annotation types are walked
      const {children, markDefs}: Partial<SanityObjectShape> = current.shape
      if (
        children &&
        isObjectArraySchema(children) &&
        isObjectUnionSchema(children.element)
      ) {
        for (const member of children.element.union) {
          const resolved = getLazySchema(member)
          if (
            (isObjectSchema(resolved) || isDocumentSchema(resolved)) &&
            getInstanceName(resolved) === 'span'
          ) {
            continue
          }
          visitUnionMember(member, [...path, 'children'])
        }
      }
      if (markDefs) {
        visit(markDefs, [...path, 'markDefs'])
      }
    }
  }

  function visitUnionMember(member: SanityType, path: string[]): void {
    const resolved = getLazySchema(member)
    if (isNeverSchema(resolved)) {
      return
    }
    const name =
      isObjectSchema(resolved) || isDocumentSchema(resolved)
        ? getInstanceName(resolved)
        : undefined
    visit(resolved, name ? [...path, name] : path)
  }

  visit(schema, [])
  return found
}
