import {isDocumentSchema, isLiteralSchema, isObjectSchema} from '../asserters'
import {
  type DocumentSchema,
  type InferLiteralValue,
  type LiteralSchema,
  type ObjectSchema,
  type Schema,
} from '../defs'
import {getLazySchema} from '../helpers/getLazySchema'
import {isEmpty} from '../helpers/isEmpty'

function canCreateLiteralFrom(
  schema: Schema,
): schema is LiteralSchema | DocumentSchema | ObjectSchema {
  return (
    isObjectSchema(schema) ||
    isDocumentSchema(schema) ||
    isLiteralSchema(schema)
  )
}

export function createLiteralValue<T extends Schema>(
  _schema: T,
): InferLiteralValue<T> {
  const schema = getLazySchema(_schema)

  if (isObjectSchema(schema) || isDocumentSchema(schema)) {
    return createObject(schema) as any
  }
  if (isLiteralSchema(schema)) {
    return schema.value as any
  }
  throw new Error(`Cannot create literal value from "${schema.typeName}"`)
}
function createObject<S extends ObjectSchema | DocumentSchema>(
  schema: S,
): InferLiteralValue<S> | undefined {
  const keys: string[] = Object.keys(schema.shape)
  const value: Record<string, any> = {}
  keys.forEach(key => {
    const fieldSchema = schema.shape[key]!
    if (canCreateLiteralFrom(fieldSchema)) {
      value[key] = createLiteralValue(fieldSchema)
    }
  })
  return isEmpty(value) ? undefined : (value as any)
}
