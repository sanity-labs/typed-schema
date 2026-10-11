import {lazy} from '../creators/lazy'
import {isObjectLike} from './isObjectLike'

/**
 * Returns `shape` with every field declared as a getter replaced by a `lazy`
 * schema wrapping that getter, without calling it.
 *
 * Recursive schemas declare self-references with getters
 * (`get children() { return array(Node) }`). Spreading or serializing such a
 * shape would call the getter, before the schema exists or forever. As `lazy`
 * nodes they are resolved on demand (and cached) by `parse`, skipped by
 * `JSON.stringify` and by schema walkers, the same as an explicit `lazy()`.
 * The field's static type stays the getter's return type.
 *
 * Throws if a field declared with a plain value is not a schema. A getter
 * that returns something else throws the same error when its `lazy` schema is
 * first resolved. The type-level check in the creators skips these cases
 * (fields declared with getters, and `readonly` fields).
 */
export function deferGetters<Shape extends object>(shape: Shape): Shape {
  const descriptors = Object.getOwnPropertyDescriptors(shape)
  let hasGetters = false
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor.get) {
      hasGetters = true
    } else if (!isSchema(descriptor.value)) {
      throw notASchemaError(key)
    }
  }
  if (!hasGetters) {
    return shape
  }
  return Object.fromEntries(
    Object.entries(descriptors).map(([key, descriptor]) => [
      key,
      descriptor.get
        ? lazy(checkedGetter(key, descriptor.get, shape))
        : descriptor.value,
    ]),
  ) as Shape
}

function checkedGetter(key: string, get: () => any, shape: object) {
  return () => {
    const value = get.call(shape)
    if (!isSchema(value)) {
      throw notASchemaError(key)
    }
    return value
  }
}

function notASchemaError(key: string) {
  return new TypeError(`Field "${key}" is not a schema`)
}

function isSchema(value: unknown): boolean {
  return isObjectLike(value) && typeof value.typeName === 'string'
}
