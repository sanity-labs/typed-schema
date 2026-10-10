import {assertType, test} from 'vitest'

import {array, primitiveArray} from '../creators/array'
import {boolean} from '../creators/boolean'
import {literal} from '../creators/literal'
import {number} from '../creators/number'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {union} from '../creators/union'
import {type Infer} from '../defs'
import {parse} from '../parse'

const stringVal: string = ''
const numVal: number = 0

test('Schema composition', () => {
  const sharedFields = {someField: string()}
  const otherFields = {otherField: string()}

  const str = string()
  const num = number()
  const bool = boolean()
  const StringOrNum = union([string(), number()])
  const arr1 = primitiveArray(string())
  const polyArr = primitiveArray(union([string(), number()]))
  const PolyObjectArr = array(
    union([
      object({_type: literal('foo'), foo: string()}),
      object({_type: literal('two'), age: number()}),
    ]),
  )

  const composed = object({...sharedFields, ...otherFields})
  const lit = literal('literal value')

  const MyObj = object({
    str,
    num,
    lit,
    stringOrNum: StringOrNum,
    polyArr,
    polyObjectArr: PolyObjectArr,
    bool,
    arr1,
    composed,
  })

  type MyObj = Infer<typeof MyObj>

  assertType<MyObj['lit']>('literal value')

  // @ts-expect-error - should be the literal
  assertType<MyObj['lit']>(stringVal)

  // test inferred type
  assertType<MyObj['num']>(numVal)
  assertType<MyObj['stringOrNum']>('' as string | number)
  assertType<MyObj['polyArr']>([] as (string | number)[])

  assertType<MyObj['polyObjectArr'][0]>(
    {} as {_type: 'foo'; foo: string; _key: string},
  )

  assertType<MyObj['polyObjectArr'][0]>(
    //@ts-expect-error not a valid union type
    {} as {_type: 'foo'; foo: number; _key: string},
  )
  assertType<MyObj['composed']['someField']>(stringVal)
  assertType<MyObj['composed']['otherField']>(stringVal)

  // @ts-expect-error should be string only
  assertType<MyObj['composed']['otherField']>('' as number)

  // test validation output type
  const res = parse(MyObj, {
    str: 'string',
    num: 2,
    lit: 'literal value',
    stringOrNum: 'str',
    polyArr: [],
    polyObjectArr: [],
    bool: true,
    arr1: [],
    composed: {someField: 'foo', otherField: 'bar'},
  })
  assertType<typeof res.str>(stringVal)
  assertType<typeof res.num>(numVal)
  assertType<typeof res.bool>(false as boolean)

  assertType<typeof res.polyObjectArr>(
    {} as {_type: 'foo'; foo: string; _key: string}[],
  )

  assertType<typeof res.stringOrNum>(stringVal)
  assertType<typeof res.stringOrNum>(numVal)

  assertType<typeof res.polyArr>([] as string[])
  assertType<typeof res.polyArr>([] as number[])
})
