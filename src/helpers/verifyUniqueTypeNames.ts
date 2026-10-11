import {
  isDocumentSchema,
  isNeverSchema,
  isObjectArraySchema,
  isObjectSchema,
  isObjectUnionSchema,
  isOptionalSchema,
} from '../asserters'
import {getInstanceName} from '../content-utils/getInstanceName'
import {type SanityType} from '../defs'

export class DuplicateTypeNameError extends Error {
  constructor(
    message: string,
    public duplicates: TypeNameInfo[],
  ) {
    super(message)
  }
}

export function verifyUniqueTypeNames<S extends SanityType>(schema: S): S {
  const duplicates = Object.values(collectTypeNames(schema)).filter(
    info => info.paths.length > 1,
  )
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
type CollectedTypeNameInfo = Record<string, TypeNameInfo>

function assignTypeInfo(
  target: CollectedTypeNameInfo,
  t2: CollectedTypeNameInfo,
) {
  for (const [typeName, info] of Object.entries(t2)) {
    if (!target[typeName]) {
      target[typeName] = info
    } else {
      target[typeName].paths.push(...info.paths)
    }
  }
}

export function collectTypeNames<S extends SanityType>(
  schema: S,
  path: string[] = [],
): Record<string, TypeNameInfo> {
  if (isOptionalSchema(schema)) {
    return collectTypeNames(schema.type, path)
  }
  if (isObjectSchema(schema) || isDocumentSchema(schema)) {
    const instanceName = getInstanceName(schema)

    const info: CollectedTypeNameInfo = {}
    if (instanceName) {
      info[instanceName] = {
        name: instanceName,
        paths: [path],
      }
    }
    for (const [key, valueSchema] of Object.entries(schema.shape)) {
      assignTypeInfo(info, collectTypeNames(valueSchema, [...path, key]))
    }
    return info
  }
  if (isObjectArraySchema(schema)) {
    return collectTypeNames(schema.element, path)
  }
  if (isObjectUnionSchema(schema)) {
    const info: CollectedTypeNameInfo = {}

    for (const unionSchema of schema.union) {
      if (isNeverSchema(unionSchema)) {
        continue
      }
      const instanceName = getInstanceName(unionSchema)

      const nextPath = instanceName ? [...path, instanceName] : path
      assignTypeInfo(info, collectTypeNames(unionSchema, nextPath))
    }
    return info
  }
  return {}
}
