import {describe, expectTypeOf, test} from 'vitest'

import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {string} from '../creators/string'
import {
  formatIssues,
  type IssueLike,
  parse,
  type ParseIssue,
  type ParseOptions,
  parseOrThrow,
} from '../parse'
import {type StandardSchemaV1} from '../standardSchema'

const Pet = object({_type: literal('pet'), name: string()})

describe('parse options', () => {
  test('parse and parseOrThrow take ParseOptions', () => {
    expectTypeOf(parse).parameter(2).toEqualTypeOf<ParseOptions | undefined>()
    expectTypeOf(parseOrThrow)
      .parameter(2)
      .toEqualTypeOf<ParseOptions | undefined>()
    parse(Pet, {}, {reportInput: true})
    // @ts-expect-error unknown option
    parse(Pet, {}, {includeInput: true})
  })

  test('input is optional on an issue', () => {
    expectTypeOf<ParseIssue['input']>().toEqualTypeOf<unknown>()
    const issue: ParseIssue = {path: [], code: 'INVALID_TYPE', message: 'x'}
    expectTypeOf(issue).toMatchTypeOf<IssueLike>()
  })
})

describe('formatIssues', () => {
  test('accepts ParseError issues and Standard Schema issues', () => {
    const result = parse(Pet, {})
    if (!result.ok) formatIssues(result.error.issues)
    const standard = Pet['~standard'].validate({})
    if ('issues' in standard && standard.issues) formatIssues(standard.issues)
    expectTypeOf(formatIssues)
      .parameter(0)
      .toMatchTypeOf<ReadonlyArray<IssueLike>>()
    expectTypeOf<StandardSchemaV1.Issue>().toMatchTypeOf<IssueLike>()
    // @ts-expect-error an issue needs a message
    formatIssues([{path: ['a']}])
  })
})
