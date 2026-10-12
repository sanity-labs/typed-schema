import {isLazySchema, isOptionalSchema} from '../asserters'
import {lazy} from '../creators/lazy'
import {type LazySchema, type OptionalSchema, type Schema} from '../defs'
import {getLazySchema} from '../helpers/getLazySchema'

export type RequiredSchema<S extends Schema> =
  S extends OptionalSchema<infer T>
    ? RequiredSchema<T>
    : S extends LazySchema<infer T>
      ? LazySchema<RequiredSchema<T>>
      : S
export function required<S extends Schema>(schema: S): RequiredSchema<S> {
  if (isOptionalSchema(schema)) {
    return required(schema.type)
  }
  if (isLazySchema(schema)) {
    // Fields declared with getters are lazy schemas at runtime, see `deferGetters`
    return lazy(() => required(getLazySchema(schema))) as any
  }
  return schema as any
}
