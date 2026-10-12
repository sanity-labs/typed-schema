import {isNeverSchema, isObjectUnionSchema} from '../asserters'
import {string} from '../creators/string'
import {
  type ObjectLikeKind,
  type ObjectLikeSchema,
  type ObjectUnionKind,
  type ObjectUnionSchema,
  type Schema,
} from '../defs'
import {withoutExamples} from './annotations'
import {defineNonEnumerableGetter} from './defineNonEnumerableGetter'
import {defineType} from './defineType'

/**
 * Returns the schema a keyed copy was made from, or the schema itself if it
 * is not a keyed copy. Schema walkers use it to tell one schema reused in
 * several arrays from two declarations of the same type.
 */
export function getUnkeyedSchema(schema: Schema): Schema {
  return isKeyedCopy(schema) ? schema.unkeyed : schema
}

function isKeyedCopy(schema: Schema): schema is Schema & {unkeyed: Schema} {
  return 'unkeyed' in schema
}

/**
 * Returns a copy of `schema` with a `_key` string field added (to each member,
 * for a union) and `unkeyed` pointing back to `schema`, as `array()` uses it
 * for its `element`. A keyed copy is returned as is.
 */
export function getKeyedSchema<T extends ObjectLikeKind | ObjectUnionKind>(
  target: T,
): T {
  const schema = target as Schema as ObjectUnionSchema | ObjectLikeSchema
  if (isKeyedCopy(schema)) {
    return target
  }
  // The copy keeps the annotations, except `examples`: those are values of
  // the schema without `_key`, which `validateExamples` checks through
  // `getUnkeyedSchema`. Built through `defineType`, since a spread drops the
  // non-enumerable `output` and `~standard` properties of `schema`
  const {annotations: _annotations, ...rest} = schema
  const withKey = defineType(
    isObjectUnionSchema(schema)
      ? {
          ...rest,
          union: schema.union.map(unionType =>
            isNeverSchema(unionType) ? unionType : getKeyedSchema(unionType),
          ),
        }
      : {...rest, shape: {...schema.shape, _key: string()}},
    withoutExamples(schema.annotations),
  )
  defineNonEnumerableGetter(withKey, 'unkeyed', () => schema)
  return withKey as Schema as T
}
