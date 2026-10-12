import {
  type EnumInput,
  type EnumSchema,
  type NormalizedEnum,
  type OutputOf,
  type SchemaAnnotations,
} from '../defs'
import {defineType} from '../helpers/defineType'

export function enums<const Enums extends EnumInput>(
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
