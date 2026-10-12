import {
  ASSET_TYPE_NAMES,
  type AssetSchema,
  type BlockSchema,
  type BooleanSchema,
  type DateSchema,
  type DateTimeSchema,
  type DocumentSchema,
  type DocumentUnionSchema,
  type EnumSchema,
  EXTENDABLE_OBJECT_TYPE_NAMES,
  type ExtendableObjectSchema,
  type FileSchema,
  type ImageSchema,
  type LazySchema,
  type LiteralSchema,
  type NeverSchema,
  type NumberSchema,
  OBJECT_LIKE_TYPE_NAMES,
  type ObjectArraySchema,
  type ObjectLikeSchema,
  type ObjectSchema,
  type ObjectUnionSchema,
  type OptionalSchema,
  type PrimitiveArraySchema,
  type PrimitiveSchema,
  type PrimitiveUnionSchema,
  type ReferenceSchema,
  type Schema,
  type StringSchema,
  type TypedObjectSchema,
} from './defs'

export function isNeverSchema(schema: Schema): schema is NeverSchema {
  return schema.typeName === 'never'
}
export function isObjectUnionSchema(
  schema: Schema,
): schema is ObjectUnionSchema {
  return schema.typeName === 'union'
}
export function isDocumentUnionSchema(
  schema: Schema,
): schema is DocumentUnionSchema {
  return schema.typeName === 'documentUnion'
}
export function isPrimitiveUnionSchema(
  schema: Schema,
): schema is PrimitiveUnionSchema {
  return schema.typeName === 'primitiveUnion'
}
export function isEnumSchema(schema: Schema): schema is EnumSchema {
  return schema.typeName === 'enum'
}
export function isObjectSchema(schema: Schema): schema is ObjectSchema {
  return schema.typeName === 'object'
}
export function isObjectLikeSchema(schema: Schema): schema is ObjectLikeSchema {
  return (OBJECT_LIKE_TYPE_NAMES as any).includes(schema.typeName)
}
export function isExtendableObjectSchema(
  schema: Schema,
): schema is ExtendableObjectSchema {
  return (EXTENDABLE_OBJECT_TYPE_NAMES as any).includes(schema.typeName)
}
export function isImageSchema(schema: Schema): schema is ImageSchema {
  return schema.typeName === 'image'
}
export function isFileSchema(schema: Schema): schema is FileSchema {
  return schema.typeName === 'file'
}
export function isBlockSchema(schema: Schema): schema is BlockSchema {
  return schema.typeName === 'block'
}

export function isAssetSchema(schema: Schema): schema is AssetSchema {
  return (ASSET_TYPE_NAMES as any).includes(schema.typeName)
}
export function isDocumentSchema(schema: Schema): schema is DocumentSchema {
  return schema.typeName === 'document'
}
export function isReferenceSchema(
  schema: Schema,
): schema is ReferenceSchema<any> {
  return schema.typeName === 'reference'
}
export function isLazySchema(schema: Schema): schema is LazySchema<any> {
  return schema.typeName === 'lazy'
}
export function isLiteralSchema(schema: Schema): schema is LiteralSchema {
  return schema.typeName === 'literal'
}
/**
 * Whether the array element schema is an object-like type (object, document,
 * reference, block, image, file) or a (possibly nested) union of those, in
 * which case array items are keyed objects (`_key`)
 */
export function isItemObjectArrayCompatible(
  elementSchema: Schema,
): elementSchema is ObjectLikeSchema | ObjectUnionSchema {
  return (
    isObjectLikeSchema(elementSchema) ||
    (isObjectUnionSchema(elementSchema) &&
      elementSchema.union.every(
        def => isNeverSchema(def) || isItemObjectArrayCompatible(def),
      ))
  )
}

export function isStringSchema(schema: Schema): schema is StringSchema {
  return schema.typeName === 'string'
}
export function isDateSchema(schema: Schema): schema is DateSchema {
  return schema.typeName === 'date'
}
export function isDateTimeSchema(schema: Schema): schema is DateTimeSchema {
  return schema.typeName === 'dateTime'
}
export function isNumberSchema(schema: Schema): schema is NumberSchema {
  return schema.typeName === 'number'
}
export function isBooleanSchema(schema: Schema): schema is BooleanSchema {
  return schema.typeName === 'boolean'
}
export function isOptionalSchema(
  schema: Schema,
): schema is OptionalSchema<any> {
  return schema.typeName === 'optional'
}
export function isObjectArraySchema(
  schema: Schema,
): schema is ObjectArraySchema {
  return schema.typeName === 'objectArray'
}
export function isPrimitiveSchema(schema: Schema): schema is PrimitiveSchema {
  return (
    isStringSchema(schema) ||
    isBooleanSchema(schema) ||
    isNumberSchema(schema) ||
    isDateSchema(schema) ||
    isDateTimeSchema(schema)
  )
}

export function isTypedObjectSchema(
  schema: Schema,
): schema is TypedObjectSchema {
  return (
    isObjectLikeSchema(schema) &&
    schema.shape._type &&
    isLiteralSchema(schema.shape._type) &&
    typeof schema.shape._type.value === 'string'
  )
}
export function isPrimitiveArraySchema(
  schema: Schema,
): schema is PrimitiveArraySchema {
  return schema.typeName === 'primitiveArray'
}
