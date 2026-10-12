import {isLiteralSchema} from '../asserters'
import {type ObjectLikeSchema} from '../defs'

export function getInstanceName(schema: ObjectLikeSchema) {
  const _type = schema.shape?._type
  if (!_type) {
    return undefined
  }
  if (isLiteralSchema(_type)) {
    if (typeof _type.value === 'string') {
      return _type.value
    }
    throw new Error(
      `Expected _type literal to be a string, instead found: ${typeof _type.value}`,
    )
  }
  throw new Error(
    `Expected _type property to be a literal string, instead found: ${_type.typeName}`,
  )
}
