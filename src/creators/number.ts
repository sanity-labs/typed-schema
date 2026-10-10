import {type NumberConstraints, type SanityNumber} from '../defs'
import {defineType} from '../helpers/defineType'

export function number(constraints?: NumberConstraints): SanityNumber {
  return defineType({typeName: 'number', constraints})
}

export function safeint() {
  return number({
    min: Number.MIN_SAFE_INTEGER,
    max: Number.MAX_SAFE_INTEGER,
    step: 1,
  })
}

export function uint32() {
  return number({min: 0, max: 4294967295, step: 1})
}

export function int32() {
  return number({min: -2147483648, max: 2147483647, step: 1})
}

export function float32() {
  return number({min: -3.4028234663852886e38, max: 3.4028234663852886e38})
}

export function float64() {
  return number({min: -Number.MAX_VALUE, max: Number.MAX_VALUE})
}
