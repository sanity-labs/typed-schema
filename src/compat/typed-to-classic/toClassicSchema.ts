import type * as classic from '@sanity/types'

import {
  isAssetSchema,
  isBlockSchema,
  isBooleanSchema,
  isDateSchema,
  isDateTimeSchema,
  isDocumentSchema,
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
  type SanityAny,
  type SanityAsset,
  type SanityBlock,
  type SanityDocument,
  type SanityObjectArray,
  type SanityObjectLike,
  type SanityObjectUnion,
  type SanityReference,
} from '../../defs'

export function toClassicSchema<S extends SanityDocument>(
  schema: S,
): classic.SchemaTypeDefinition[] {
  const typeLiteral = schema.shape._type

  if (
    !typeLiteral ||
    !isLiteralSchema(typeLiteral) ||
    typeof typeLiteral.value !== 'string'
  ) {
    throw new Error('Expected _type property of schema to be a string literal')
  }

  const hoisted = new Map()
  return [
    {
      type: 'document',
      name: typeLiteral.value,
      fields: Object.entries(schema.shape)
        .filter(([fieldName]) => !fieldName.startsWith('_'))
        .flatMap(([fieldName, field]) =>
          convertField(fieldName, field, hoisted),
        ),
    },
  ]
}

function convertItem<S extends SanityAny>(
  schema: S,
  hoisted: Map<string, classic.SchemaTypeDefinition[]>,
): classic.ArrayOfType | classic.ArrayOfType[] {
  if (isAssetSchema(schema)) {
    return assetToClassicSchema(schema, hoisted) as classic.ArrayOfType
  }
  if (isBlockSchema(schema)) {
    return blockToClassicSchema(schema, hoisted) as classic.ArrayOfType
  }
  if (isPrimitiveUnionSchema(schema)) {
    // we don't support this currently in v3, so fallback to the first type
    const unionType = schema.union[0]
    if (!unionType) {
      throw new Error('Expected union schema to have at least one member type')
    }
    return convertItem(unionType, hoisted)
  }
  if (isReferenceSchema(schema)) {
    return referenceToClassicSchema(schema, hoisted)
  }
  if (isObjectLikeSchema(schema)) {
    return objectToClassicSchema(schema, hoisted) as classic.ArrayOfType
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
    return schema.union.flatMap(unionType => convertItem(unionType, hoisted))
  }
  if (isPrimitiveUnionSchema(schema)) {
    return schema.union.flatMap(unionType => convertItem(unionType, hoisted))
  }
  throw new Error(`Unsupported schema type ${schema.typeName}}`)
}

function convertField<S extends SanityAny>(
  fieldName: string,
  schema: S,
  hoisted: Map<string, classic.SchemaTypeDefinition[]>,
): classic.FieldDefinition | classic.FieldDefinition[] {
  if (isOptionalSchema(schema)) {
    return convertField(fieldName, schema.type, hoisted)
  }

  if (isObjectSchema(schema)) {
    return [{...objectToClassicSchema(schema, hoisted), name: fieldName}]
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
    return {...referenceToClassicSchema(schema, hoisted), name: fieldName}
  }
  if (isAssetSchema(schema)) {
    return {...assetToClassicSchema(schema, hoisted), name: fieldName}
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
      of: isObjectUnionSchema(schema.element)
        ? schema.element.union.flatMap(u => convertItem(u, hoisted))
        : [convertItem(schema.element, hoisted)].flat(),
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

function objectToClassicSchema<S extends SanityObjectLike>(
  schema: S,
  hoisted: Map<string, classic.SchemaTypeDefinition[]>,
) {
  const typeLiteral = schema.shape._type

  const typeName =
    typeLiteral && isLiteralSchema(typeLiteral) ? typeLiteral.value : undefined

  return {
    type: schema.typeName,
    name: typeName,
    fields: Object.entries(schema.shape)
      .filter(([fieldName]) => !fieldName.startsWith('_'))
      .flatMap(([fieldName, field]) => convertField(fieldName, field, hoisted)),
  }
}
function referenceToClassicSchema(
  schema: SanityReference,
  hoisted: Map<string, classic.SchemaTypeDefinition[]>,
) {
  if (!isDocumentSchema(schema.referenceType)) {
    throw new Error('References can only reference documents, not other types')
  }
  const referenceType = schema.referenceType.shape._type
  if (!isLiteralSchema(referenceType)) {
    throw new Error('References can only reference named document types')
  }
  const refTypeName = referenceType.value
  let existing = hoisted.get(refTypeName)
  if (!existing) {
    existing = toClassicSchema(schema.referenceType)
    hoisted.set(refTypeName, existing)
  }

  return {type: 'reference', to: {type: refTypeName}}
}
function blockToClassicSchema<S extends SanityBlock>(
  schema: S,
  hoisted: Map<string, classic.SchemaTypeDefinition[]>,
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
    ).union.flatMap(u => convertItem(u, hoisted)),
  }
}

function assetToClassicSchema<S extends SanityAsset>(
  schema: S,
  hoisted: Map<string, classic.SchemaTypeDefinition[]>,
) {
  const systemFieldNames = ['asset']

  return objectToClassicSchema(
    {
      ...schema,
      shape: Object.fromEntries(
        Object.entries(schema.shape).filter(
          ([fieldName]) => !systemFieldNames.includes(fieldName),
        ),
      ),
    },
    hoisted,
  )
}
