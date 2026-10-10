import {isLazySchema} from '../asserters'
import {type SanityLazy, type SanityType} from '../defs'

// Resolved lazy schemas are cached off-object so schema objects stay plain,
// serializable data (no `_cache` property, no circular references)
const cache = new WeakMap<SanityLazy<any>, SanityType>()

/**
 * Returns the schema a lazy schema wraps (resolving nested lazy schemas), or
 * the schema itself if it is not lazy
 */
export function getLazySchema(schema: SanityType): SanityType {
  let current: SanityType = schema
  while (isLazySchema(current)) {
    const cached = cache.get(current)
    if (cached !== undefined) {
      current = cached
      continue
    }
    const resolved: SanityType = current.get()
    cache.set(current, resolved)
    current = resolved
  }
  return current
}
