import {
  isObjectArraySchema,
  isObjectSchema,
  isPrimitiveSchema,
} from '../asserters'
import {optional} from '../creators/optional'
import {type OutputOf, type SanityAny} from '../defs'
import {isObjectLike} from '../helpers/isObjectLike'
import {safeParse} from '../parse'
import {type DeepPartial} from '../utils/deepPartial'

/**
 * Assigns values to a schema, but only if the schema has a matching key.
 * @param schema - the schema to pick values for
 * @param value - the value to pick from
 */
export function pickDeep<S extends SanityAny>(
  schema: S,
  value: unknown,
): OutputOf<DeepPartial<S>> {
  if (isObjectSchema(schema)) {
    if (!isObjectLike(value)) {
      throw new Error('Cannot pick deep from a non-object value')
    }
    return Object.fromEntries(
      Object.entries(schema.shape)
        .filter(([key]) => key in value)
        .flatMap(([key, propertySchema]) => {
          const picked = pickDeep(propertySchema, value[key])
          return picked === undefined ? [] : [[key, picked]]
        }),
    )
  }
  if (isObjectArraySchema(schema)) {
    throw new Error('TODO: implement')
  }

  if (isPrimitiveSchema(schema)) {
    const parsed = safeParse(optional(schema), value)
    return parsed.status === 'ok' ? parsed.value : undefined
  }
  return undefined
}
