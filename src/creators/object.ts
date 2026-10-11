import {
  type SanityAny,
  type SanityKind,
  type SanityObject,
  type SanityObjectShape,
} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {type ValidFieldName} from '../helpers/utilTypes'

/**
 * Maps every field name of `Shape` that is not a valid field name (and not in
 * `Allowed`) to `never`. Intersected with a shape parameter, it rejects invalid
 * names at the offending property. Wrap it in `NoInfer`: inferring `Shape`
 * through it reads fields declared with getters before the schema exists, and
 * recursive schemas collapse to `any`.
 */
export type InvalidFieldNames<Shape, Allowed extends string = never> = {
  [
    Property in keyof Shape as Property extends Allowed
      ? never
      : string extends Property
        ? never // index signature, e.g. a shape built at runtime
        : Property extends ValidFieldName<Property>
          ? never
          : Property
  ]: never
}

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

/**
 * `Shape` with every value replaced by `0` and `?` removed. A homomorphic
 * mapped type keeps the `readonly` modifier without reading the values.
 */
type ReadonlyModifiers<Shape> = {[Property in keyof Shape]-?: 0}

/**
 * Requires every field of `Shape` to be a schema, except fields declared with
 * getters. Reading a getter's type while `Shape` is inferred breaks recursive
 * schemas, so those are told apart by their modifier instead: a getter without
 * a setter is a `readonly` property, and checking that reads no values. Wrap it
 * in `NoInfer`, like {@link InvalidFieldNames}.
 *
 * Only fields that are not schemas are mapped. A schema is matched on having
 * `typeName` and `output` keys, so the type of `output` is never compared.
 * Mapping every field to `SanityAny` would intersect each schema
 * with it, and TypeScript 6 resolves the `output` of such an intersection,
 * which reads getters nested in the field (`cover: object({get related() {...}})`).
 */
export type FieldSchemas<Shape> = {
  [
    Property in keyof Shape as Equals<
      Pick<ReadonlyModifiers<Shape>, Property>,
      {-readonly [P in Property]: 0}
    > extends true
      ? Shape[Property] extends SanityKind & {output: unknown}
        ? never
        : Property
      : never
  ]: SanityAny
}

export function object<Shape extends {[key: string]: any} = SanityObjectShape>(
  shape: Shape &
    NoInfer<InvalidFieldNames<Shape, '_type'> & FieldSchemas<Shape>>,
): SanityObject<Shape> {
  return defineType({typeName: 'object', shape: deferGetters(shape)})
}
