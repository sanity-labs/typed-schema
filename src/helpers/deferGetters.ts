import {lazy} from '../creators/lazy'

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
 */
export function deferGetters<Shape extends object>(shape: Shape): Shape {
  const descriptors = Object.getOwnPropertyDescriptors(shape)
  if (!Object.values(descriptors).some(descriptor => descriptor.get)) {
    return shape
  }
  return Object.fromEntries(
    Object.entries(descriptors).map(([key, descriptor]) => [
      key,
      descriptor.get ? lazy(descriptor.get.bind(shape)) : descriptor.value,
    ]),
  ) as Shape
}
