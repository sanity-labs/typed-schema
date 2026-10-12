import type * as classic from '@sanity/types'

import {
  isAssetSchema,
  isBlockSchema,
  isBooleanSchema,
  isDateSchema,
  isDateTimeSchema,
  isDocumentSchema,
  isDocumentUnionSchema,
  isEnumSchema,
  isLiteralSchema,
  isNeverSchema,
  isNumberSchema,
  isObjectArraySchema,
  isObjectLikeSchema,
  isObjectSchema,
  isObjectUnionSchema,
  isOptionalSchema,
  isPrimitiveArraySchema,
  isPrimitiveUnionSchema,
  isReferenceSchema,
  isStringSchema,
} from '../../asserters'
import {
  type SanityAsset,
  type SanityBlock,
  type SanityDocument,
  type SanityObjectArray,
  type SanityObjectLike,
  type SanityObjectShape,
  type SanityObjectUnion,
  type SanityReference,
  type SanityType,
} from '../../defs'
import {
  type GetAnnotationsOptions,
  getAnnotations,
} from '../../helpers/annotations'
import {getLazySchema} from '../../helpers/getLazySchema'
import {listReferenceTargets} from '../../helpers/referenceTargets'

export type ToClassicSchemaOptions = GetAnnotationsOptions

/**
 * The classic field/type properties a schema's annotations map to
 * @param schema - the schema to read annotations from
 * @param options - which locale to resolve annotation text in
 */
function classicAnnotations(
  schema: SanityType,
  options: ToClassicSchemaOptions,
) {
  const annotations = getAnnotations(schema, options)
  if (!annotations) {
    return {}
  }
  return {
    ...(annotations.title !== undefined && {title: annotations.title}),
    ...(annotations.description !== undefined && {
      description: annotations.description,
    }),
    ...(annotations.deprecated !== undefined && {
      deprecated: {reason: annotations.deprecated},
    }),
    ...(annotations.readOnly !== undefined && {readOnly: annotations.readOnly}),
  }
}

// Untyped objects are keyed by identity. A `lazy()` that builds a new schema
// each time it resolves never repeats an identity, so past this depth the
// cycle is reported instead of overflowing the stack.
const MAX_DEPTH = 100

interface Context {
  /**
   * Recursive object types, emitted as named top-level types after the
   * document and referred to by their `_type` name
   */
  hoisted: Map<
    string,
    {schema: SanityObjectLike; definition: classic.SchemaTypeDefinition}
  >
  /**
   * Object types currently being converted, outermost first. Typed objects
   * are matched by their `_type` name (`name`), other object-like types by
   * the schema. Identity is not enough for typed objects: `array()` copies
   * object elements to add `_key`, and `deepPartial` wraps getter fields in a
   * `lazy()` that builds a new schema on every resolution, so a cycle matched
   * by identity might never close.
   */
  converting: Array<{name: string | undefined; schema: SanityObjectLike}>
  /** `_type` names of object types found to contain themselves */
  recursive: Set<string>
  options: ToClassicSchemaOptions
}

export function toClassicSchema<S extends SanityDocument>(
  schema: S,
  options: ToClassicSchemaOptions = {},
): classic.SchemaTypeDefinition[] {
  const typeLiteral = schema.shape._type

  if (
    !typeLiteral ||
    !isLiteralSchema(typeLiteral) ||
    typeof typeLiteral.value !== 'string'
  ) {
    throw new Error('Expected _type property of schema to be a string literal')
  }

  const context: Context = {
    hoisted: new Map(),
    converting: [],
    recursive: new Set(),
    options,
  }
  const document = {
    type: 'document',
    name: typeLiteral.value,
    ...classicAnnotations(schema, options),
    fields: convertFields(schema.shape, context),
  }
  return [
    document,
    ...[...context.hoisted.values()].map(({definition}) => definition),
  ]
}

function convertFields(shape: SanityObjectShape, context: Context) {
  return Object.entries(shape)
    .filter(([fieldName]) => !fieldName.startsWith('_'))
    .flatMap(([fieldName, field]) => convertField(fieldName, field, context))
}

function convertItem(
  lazySchema: SanityType,
  context: Context,
): classic.ArrayOfType | classic.ArrayOfType[] {
  const items = convertItemType(lazySchema, context)
  const annotations = classicAnnotations(lazySchema, context.options)
  return Array.isArray(items)
    ? items.map(item => ({...item, ...annotations}))
    : {...items, ...annotations}
}

function convertItemType(
  lazySchema: SanityType,
  context: Context,
): classic.ArrayOfType | classic.ArrayOfType[] {
  const schema = getLazySchema(lazySchema)
  if (isDocumentUnionSchema(schema)) {
    throw new Error(
      'A union() of documents can only be a reference() target in a classic schema, e.g. reference(union([Author, Book]))',
    )
  }
  if (isAssetSchema(schema)) {
    return assetToClassicSchema(schema, context) as classic.ArrayOfType
  }
  if (isBlockSchema(schema)) {
    return blockToClassicSchema(schema, context) as classic.ArrayOfType
  }
  if (isPrimitiveUnionSchema(schema)) {
    // we don't support this currently in v3, so fallback to the first type
    const unionType = schema.union[0]
    if (!unionType) {
      throw new Error('Expected union schema to have at least one member type')
    }
    return convertItem(unionType, context)
  }
  if (isReferenceSchema(schema)) {
    return referenceToClassicSchema(schema)
  }
  if (isObjectLikeSchema(schema)) {
    return objectToClassicSchema(schema, context) as classic.ArrayOfType
  }
  if (isLiteralSchema(schema)) {
    return {
      type: typeof schema.value,
      options: {
        list: [schema.value],
      },
    }
  }
  if (
    isStringSchema(schema) ||
    isBooleanSchema(schema) ||
    isNumberSchema(schema)
  ) {
    return {
      type: schema.typeName,
    }
  }
  if (isDateTimeSchema(schema)) {
    return {type: 'datetime'}
  }
  if (isNeverSchema(schema)) {
    return []
  }
  if (isObjectUnionSchema(schema)) {
    return schema.union.flatMap(unionType => convertItem(unionType, context))
  }
  if (isPrimitiveUnionSchema(schema)) {
    return schema.union.flatMap(unionType => convertItem(unionType, context))
  }
  throw new Error(`Unsupported schema type ${schema.typeName}}`)
}

function convertField(
  fieldName: string,
  lazySchema: SanityType,
  context: Context,
): classic.FieldDefinition | classic.FieldDefinition[] {
  const fields = convertFieldType(fieldName, lazySchema, context)
  const annotations = classicAnnotations(lazySchema, context.options)
  return Array.isArray(fields)
    ? fields.map(
        field => ({...field, ...annotations}) as classic.FieldDefinition,
      )
    : ({...fields, ...annotations} as classic.FieldDefinition)
}

function convertFieldType(
  fieldName: string,
  lazySchema: SanityType,
  context: Context,
): classic.FieldDefinition | classic.FieldDefinition[] {
  const schema = getLazySchema(lazySchema)
  if (isOptionalSchema(schema)) {
    return convertFieldType(fieldName, schema.type, context)
  }
  if (isDocumentUnionSchema(schema)) {
    throw new Error(
      'A union() of documents can only be a reference() target in a classic schema, e.g. reference(union([Author, Book]))',
    )
  }

  if (isObjectSchema(schema)) {
    return [{...objectToClassicSchema(schema, context), name: fieldName}]
  }
  if (isLiteralSchema(schema)) {
    return [
      {
        name: fieldName,
        type: typeof schema.value,
        options: {
          list: [schema.value],
        },
      },
    ]
  }
  if (isReferenceSchema(schema)) {
    return {...referenceToClassicSchema(schema), name: fieldName}
  }
  if (isAssetSchema(schema)) {
    return {...assetToClassicSchema(schema, context), name: fieldName}
  }
  if (isDateTimeSchema(schema)) {
    return {name: fieldName, type: 'datetime'}
  }
  if (isDateSchema(schema)) {
    return {name: fieldName, type: 'date'}
  }
  if (
    isStringSchema(schema) ||
    isBooleanSchema(schema) ||
    isNumberSchema(schema)
  ) {
    return {
      name: fieldName,
      type: schema.typeName,
    }
  }
  if (isObjectArraySchema(schema) || isPrimitiveArraySchema(schema)) {
    return {
      name: fieldName,
      type: 'array',
      of: [convertItem(schema.element, context)].flat(),
    } as classic.FieldDefinition<'array'>
  }
  if (isEnumSchema(schema)) {
    const valueTypes = new Set(
      Object.values(schema.enum).map(value => typeof value),
    )
    if (valueTypes.size > 1) {
      // eslint-disable-next-line no-console
      console.warn(
        "Multiple types in enum is not backwards compatible, falling back to 'string' type.",
      )
    }

    const type = valueTypes.size === 1 ? [...valueTypes][0] : 'string'

    return {
      name: fieldName,
      type: type!,
      options: {
        list: Object.entries(schema.enum).map(([label, value]) => ({
          title: label,
          value,
        })),
      },
    }
  }

  return []
}

/**
 * Converts an object-like schema to an inline classic definition, or, for a
 * typed object that contains itself, to `{type: <_type name>}` with the
 * definition hoisted to the top level. `shape` lets assets leave out their
 * system fields while keeping the schema's identity.
 */
function objectToClassicSchema<S extends SanityObjectLike>(
  schema: S,
  context: Context,
  shape: SanityObjectShape = schema.shape,
) {
  const typeLiteral = schema.shape._type

  const typeName =
    typeLiteral && isLiteralSchema(typeLiteral) ? typeLiteral.value : undefined

  // Only plain objects can become named top-level types: `image` and `file`
  // have the built-in type name as their `_type`
  const hoistableName =
    isObjectSchema(schema) && typeof typeName === 'string'
      ? typeName
      : undefined

  if (
    hoistableName !== undefined &&
    context.hoisted.get(hoistableName)?.schema === schema
  ) {
    return {type: hoistableName}
  }

  if (context.converting.length >= MAX_DEPTH) {
    throw new Error(
      `Cannot convert schema: objects are nested more than ${MAX_DEPTH} levels deep. A recursive object type needs a \`_type\` literal to become a named type`,
    )
  }
  if (hoistableName === undefined) {
    // An untyped object can't be referred to by name. Converting it again is
    // fine as long as the cycle passes through a typed object, which closes
    // it further in
    const previous = context.converting.findLastIndex(
      entry => entry.schema === schema,
    )
    if (
      previous !== -1 &&
      !context.converting
        .slice(previous)
        .some(entry => entry.name !== undefined)
    ) {
      throw new Error(
        isAssetSchema(schema)
          ? `Cannot convert recursive ${schema.typeName} schema: an image or file cannot become a named type, so the cycle must pass through an object with a \`_type\` literal or a reference()`
          : `Cannot convert recursive ${schema.typeName} schema: it needs a \`_type\` literal to become a named type`,
      )
    }
  } else {
    const cycleStart = context.converting.findIndex(
      entry => entry.name === hoistableName,
    )
    if (cycleStart !== -1) {
      // Copies of one type have the same fields; a different type that
      // shares the name is not recursion
      if (
        fieldNames(context.converting[cycleStart]!.schema) !==
        fieldNames(schema)
      ) {
        throw new Error(
          `Cannot convert schema: two different object types have the \`_type\` "${hoistableName}"`,
        )
      }
      for (const entry of context.converting.slice(cycleStart)) {
        if (entry.name !== undefined) {
          context.recursive.add(entry.name)
        }
      }
      return {type: hoistableName}
    }
  }

  context.converting.push({name: hoistableName, schema})
  const definition = {
    type: schema.typeName,
    name: typeName,
    ...classicAnnotations(schema, context.options),
    fields: convertFields(shape, context),
  }
  context.converting.pop()

  if (hoistableName !== undefined && context.recursive.has(hoistableName)) {
    const existing = context.hoisted.get(hoistableName)
    // `array()` and `deepPartial` produce several schema objects for the
    // same type; they are the same type if they convert the same
    if (
      existing &&
      JSON.stringify(existing.definition) !== JSON.stringify(definition)
    ) {
      throw new Error(
        `Cannot convert schema: two different recursive object types have the \`_type\` "${hoistableName}"`,
      )
    }
    context.hoisted.set(hoistableName, {
      schema,
      definition: definition as classic.SchemaTypeDefinition,
    })
    return {type: hoistableName}
  }
  return definition
}
function fieldNames(schema: SanityObjectLike) {
  return Object.keys(schema.shape)
    .filter(fieldName => !fieldName.startsWith('_'))
    .sort()
    .join()
}

function referenceToClassicSchema(schema: SanityReference) {
  const to = listReferenceTargets(schema.referenceType).map(target => {
    const referenceType = getLazySchema(target)
    if (!isDocumentSchema(referenceType)) {
      throw new Error(
        'References can only reference documents, not other types',
      )
    }
    const typeLiteral = referenceType.shape._type
    if (!isLiteralSchema(typeLiteral)) {
      throw new Error('References can only reference named document types')
    }
    return typeLiteral.value
  })
  const types = Array.from(new Set(to), type => ({type}))
  return {type: 'reference', to: types.length === 1 ? types[0] : types}
}
function blockToClassicSchema<S extends SanityBlock>(
  schema: S,
  context: Context,
) {
  const typeLiteral = schema.shape._type

  const typeName =
    typeLiteral && isLiteralSchema(typeLiteral) ? typeLiteral.value : undefined

  const {children} = schema.shape
  return {
    type: 'block',
    name: typeName,
    of: (
      (children as SanityObjectArray).element as SanityObjectUnion
    ).union.flatMap(u => convertItem(u, context)),
  }
}

function assetToClassicSchema<S extends SanityAsset>(
  schema: S,
  context: Context,
) {
  const systemFieldNames = ['asset']

  return objectToClassicSchema(
    schema,
    context,
    Object.fromEntries(
      Object.entries(schema.shape).filter(
        ([fieldName]) => !systemFieldNames.includes(fieldName),
      ),
    ),
  )
}
