import {expect, test} from 'vitest'

import {int32, number, safeint, uint32} from '../creators/number'
import {parse} from '../parse'

test('parse a number', () => {
  const numberSchema = number()
  expect(parse(numberSchema, 1)).toEqual(1)
  expect(parse(numberSchema, 1.1)).toEqual(1.1)
})

test('min/max constraints', () => {
  const min1max20 = number({min: 1, max: 20})
  expect(parse(min1max20, 1)).toEqual(1)
  expect(parse(min1max20, 20)).toEqual(20)
  expect(() => parse(min1max20, 0.9)).toThrowErrorMatchingInlineSnapshot(
    `[Error: Invalid input at "<root>": Expected a number greater than, or equal to 1]`,
  )
  expect(() => parse(min1max20, 20.1)).toThrowErrorMatchingInlineSnapshot(
    `[Error: Invalid input at "<root>": Expected a number less than, or equal to 20]`,
  )
})

test('lt/gt constraints', () => {
  const gt1lt20 = number({gt: 1, lt: 20})
  expect(parse(gt1lt20, 1.1)).toEqual(1.1)
  expect(parse(gt1lt20, 19.9)).toEqual(19.9)
  expect(() => parse(gt1lt20, 1)).toThrowErrorMatchingInlineSnapshot(
    `[Error: Invalid input at "<root>": Expected a number greater than 1]`,
  )
  expect(() => parse(gt1lt20, 20)).toThrowErrorMatchingInlineSnapshot(
    `[Error: Invalid input at "<root>": Expected a number less than 20]`,
  )
})

test('step constraints', () => {
  const multipleOfTwo = number({step: 2})
  expect(parse(multipleOfTwo, 2)).toEqual(2)
  expect(parse(multipleOfTwo, 4)).toEqual(4)
  expect(() => parse(multipleOfTwo, 1)).toThrowErrorMatchingInlineSnapshot(
    `[Error: Invalid input at "<root>": Expected a number that is a multiple of 2]`,
  )
  expect(() => parse(multipleOfTwo, 9)).toThrowErrorMatchingInlineSnapshot(
    `[Error: Invalid input at "<root>": Expected a number that is a multiple of 2]`,
  )
})

test('zero is a valid constraint boundary', () => {
  expect(parse(number({min: 0}), 0)).toEqual(0)
  expect(() => parse(number({min: 0}), -5)).toThrow()
  expect(() => parse(number({max: 0}), 5)).toThrow()
  expect(parse(number({max: 0}), -1)).toEqual(-1)
  expect(() => parse(number({gt: 0}), 0)).toThrow()
  expect(() => parse(number({lt: 0}), 0)).toThrow()
})

test('rejects NaN and infinities', () => {
  expect(() => parse(number(), NaN)).toThrowErrorMatchingInlineSnapshot(
    `[Error: Invalid input at "<root>": Expected a finite number]`,
  )
  expect(() => parse(number({min: 0}), Infinity)).toThrow()
  expect(() => parse(number(), -Infinity)).toThrow()
})

test('integer helpers reject non-integers and out-of-range values', () => {
  expect(parse(uint32(), 0)).toEqual(0)
  expect(parse(uint32(), 4294967295)).toEqual(4294967295)
  expect(() => parse(uint32(), -1)).toThrow()
  expect(() => parse(uint32(), 1.5)).toThrow()
  expect(() => parse(int32(), 1.5)).toThrow()
  expect(() => parse(int32(), 2147483648)).toThrow()
  expect(parse(int32(), -2147483648)).toEqual(-2147483648)
  expect(() => parse(safeint(), 0.1)).toThrow()
  expect(parse(safeint(), Number.MAX_SAFE_INTEGER)).toEqual(
    Number.MAX_SAFE_INTEGER,
  )
})
