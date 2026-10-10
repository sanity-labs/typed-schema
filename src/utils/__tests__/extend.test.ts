import {assertType, describe, expect, test} from 'vitest'

import {array} from '../../creators/array'
import {boolean} from '../../creators/boolean'
import {document} from '../../creators/document'
import {lazy} from '../../creators/lazy'
import {literal} from '../../creators/literal'
import {number} from '../../creators/number'
import {object} from '../../creators/object'
import {optional} from '../../creators/optional'
import {string} from '../../creators/string'
import {union} from '../../creators/union'
import {type SanityObjectType} from '../../defs'
import {parse} from '../../parse'
import {extend} from '../extend'

describe('extends helper', () => {
  test('simple extends', () => {
    const obj = object({str: string(), num: number()})
    const extended = extend(obj, {extendedStr: string(), extendedNum: number()})

    const parsed = parse(extended, {
      str: 'foo',
      num: 1,
      extendedStr: 'bar',
      extendedNum: 1,
    })

    assertType<{
      str: string
      num: number
      extendedStr: string
      extendedNum: number
    }>(parsed)

    assertType<{
      str: string
      num: string
      extendedStr: string
      extendedNum: number
    }>(
      //@ts-expect-error num should be number
      parsed,
    )
  })

  test('extends w/override', () => {
    const obj = object({
      changedFromStringToLiteralString: string(),
      changedFromNumberToString: number(),
    })

    const extended = extend(obj, {
      changedFromStringToLiteralString: literal('literally this'),
      changedFromNumberToString: string(),
    })

    const parsed = parse(extended, {
      changedFromStringToLiteralString: 'literally this',
      changedFromNumberToString: 'a string',
    })

    assertType<'literally this'>(parsed.changedFromStringToLiteralString)
    assertType<{
      changedFromStringToLiteralString: 'literally this'
      changedFromNumberToString: string
    }>(parsed)

    assertType<string>(parsed.changedFromNumberToString)

    // @ts-expect-error extended type has been refined to literal and is no longer compatible with string
    assertType<typeof parsed.changedFromStringToLiteralString>('' as string)

    // @ts-expect-error extended type has been changed from number to string
    assertType<number>(parsed.changedFromNumberToString)
  })

  test('extends of circular type', () => {
    interface Person {
      _type: 'person'
      name: string
      parent: Omit<Person, 'parent'> & {foo: string; parent?: Person}
    }

    const lazyPerson: SanityObjectType<Person> = object({
      _type: literal('person'),
      name: lazy(() => string()),
      parent: lazy(() =>
        extend(lazyPerson, {
          foo: string(),
          parent: optional(lazyPerson),
        }),
      ),
    })

    const parsed = parse(lazyPerson, {
      _type: 'person',
      name: 'foo',
      parent: {
        _type: 'person',
        name: 'parent',
        foo: 'ok',
      },
    })
    expect(parsed).toEqual({
      _type: 'person',
      name: 'foo',
      parent: {
        _type: 'person',
        foo: 'ok',
        name: 'parent',
      },
    })
  })
  test('inline extends', () => {
    const pet = object({name: string()})

    const u = union([
      extend(pet, {
        _type: literal('avine'),
        squeaks: boolean(),
      }),
      extend(pet, {
        _type: literal('feline'),
        meows: boolean(),
      }),
      extend(pet, {
        _type: literal('canine'),
        barks: boolean(),
      }),
    ])

    const _human = document({
      _type: literal('human'),
      name: string(),
      address: object({
        street: string(),
        city: string(),
        country: string(),
      }),

      pets: array(u),
    })
  })
})
