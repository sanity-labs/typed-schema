import {
  type NumberConstraints,
  type NumberSchema,
  type SchemaAnnotations,
} from '../defs'
import {splitAnnotations} from '../helpers/annotations'
import {defineType} from '../helpers/defineType'

export type NumberOptions = NumberConstraints & SchemaAnnotations<number>

export function number(options?: NumberOptions): NumberSchema {
  const [annotations, constraints] = splitAnnotations(options)
  return defineType(
    {
      typeName: 'number',
      constraints:
        Object.keys(constraints).length > 0
          ? (constraints as NumberConstraints)
          : undefined,
    },
    annotations,
  )
}

export function safeint(annotations?: SchemaAnnotations<number>) {
  return number({
    min: Number.MIN_SAFE_INTEGER,
    max: Number.MAX_SAFE_INTEGER,
    step: 1,
    ...annotations,
  })
}

export function uint32(annotations?: SchemaAnnotations<number>) {
  return number({min: 0, max: 4294967295, step: 1, ...annotations})
}

export function int32(annotations?: SchemaAnnotations<number>) {
  return number({min: -2147483648, max: 2147483647, step: 1, ...annotations})
}

export function float32(annotations?: SchemaAnnotations<number>) {
  return number({
    min: -3.4028234663852886e38,
    max: 3.4028234663852886e38,
    ...annotations,
  })
}

export function float64(annotations?: SchemaAnnotations<number>) {
  return number({min: -Number.MAX_VALUE, max: Number.MAX_VALUE, ...annotations})
}
