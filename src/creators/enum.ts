import {
  type EnumInput,
  type EnumSchema,
  type NormalizedEnum,
  type OutputOf,
  type SchemaAnnotations,
} from '../defs'
import {defineType} from '../helpers/defineType'

function enumOf<const Enums extends EnumInput>(
  values: Enums,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<EnumSchema<Enums>>>>,
): EnumSchema<Enums> {
  return defineType(
    {
      typeName: 'enum',
      enum: (Array.isArray(values)
        ? Object.fromEntries(values.map(v => [v, v]))
        : values) as NormalizedEnum<Enums>,
    },
    annotations,
  )
}

// `enum` is a reserved word, so it can't be a function name, but it can be an
// export name: `s.enum()` works with a namespace import
export {enumOf as enum}

/**
 * @deprecated Use `enum()` instead.
 */
export const enums = enumOf
