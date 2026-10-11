import {
  type EnumInput,
  type NormalizedEnum,
  type OutputOf,
  type SanityEnum,
  type SchemaAnnotations,
} from '../defs'
import {defineType} from '../helpers/defineType'

export function enums<const Enums extends EnumInput>(
  values: Enums,
  annotations?: NoInfer<SchemaAnnotations<OutputOf<SanityEnum<Enums>>>>,
): SanityEnum<Enums> {
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
