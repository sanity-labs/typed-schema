import {type SanityObject, type SanityObjectShape} from '../defs'
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

export function object<Shape extends {[key: string]: any} = SanityObjectShape>(
  shape: Shape & NoInfer<InvalidFieldNames<Shape, '_type'>>,
): SanityObject<Shape> {
  return defineType({typeName: 'object', shape: deferGetters(shape)})
}
