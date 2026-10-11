import {isLazySchema, isOptionalSchema} from '../asserters'
import {lazy} from '../creators/lazy'
import {type SanityLazy, type SanityOptional, type SanityType} from '../defs'
import {getLazySchema} from '../helpers/getLazySchema'

export type SanityRequired<S extends SanityType> =
  S extends SanityOptional<infer T>
    ? SanityRequired<T>
    : S extends SanityLazy<infer T>
      ? SanityLazy<SanityRequired<T>>
      : S
export function required<S extends SanityType>(schema: S): SanityRequired<S> {
  if (isOptionalSchema(schema)) {
    return required(schema.type)
  }
  if (isLazySchema(schema)) {
    // Fields declared with getters are lazy schemas at runtime, see `deferGetters`
    return lazy(() => required(getLazySchema(schema))) as any
  }
  return schema as any
}
