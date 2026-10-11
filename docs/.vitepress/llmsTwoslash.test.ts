import {describe, expect, test} from 'vitest'

import {stripTwoslash} from './llmsTwoslash'

describe('stripTwoslash', () => {
  test('drops the fence attribute, queries and directives', () => {
    const markdown = [
      'Intro',
      '',
      '```ts twoslash',
      '// @errors: 2322',
      "import * as s from '@sanity-labs/typed-schema'",
      '',
      'type Pet = s.Infer<typeof Pet>',
      '//   ^?',
      '```',
      '',
      'Outro',
    ].join('\n')
    expect(stripTwoslash(markdown)).toBe(
      [
        'Intro',
        '',
        '```ts',
        "import * as s from '@sanity-labs/typed-schema'",
        '',
        'type Pet = s.Infer<typeof Pet>',
        '```',
        '',
        'Outro',
      ].join('\n'),
    )
  })

  test('drops code above a cut marker, as the page hides it', () => {
    const markdown = [
      '```ts twoslash',
      "import * as s from '@sanity-labs/typed-schema'",
      '',
      'function table() {}',
      '',
      '// ---cut---',
      '// table() is the creator from the example above',
      '',
      'const Timetable = table()',
      '```',
    ].join('\n')
    expect(stripTwoslash(markdown)).toBe(
      [
        '```ts',
        '// table() is the creator from the example above',
        '',
        'const Timetable = table()',
        '```',
      ].join('\n'),
    )
  })

  test('drops code between cut-start and cut-end markers', () => {
    const markdown = [
      '```ts twoslash',
      "import * as s from '@sanity-labs/typed-schema'",
      '',
      '// ---cut-start---',
      "import {type SanityClient} from '@sanity/client'",
      'declare const client: SanityClient',
      '// ---cut-end---',
      "const recipe = await client.fetch('*[0]')",
      '```',
    ].join('\n')
    expect(stripTwoslash(markdown)).toBe(
      [
        '```ts',
        "import * as s from '@sanity-labs/typed-schema'",
        '',
        "const recipe = await client.fetch('*[0]')",
        '```',
      ].join('\n'),
    )
  })

  test('leaves other code blocks and regular comments alone', () => {
    const markdown = [
      '```ts',
      '//   ^? not twoslash here',
      '```',
      '',
      '```ts twoslash',
      '// a regular comment',
      'const a = 1',
      '```',
    ].join('\n')
    expect(stripTwoslash(markdown)).toBe(
      [
        '```ts',
        '//   ^? not twoslash here',
        '```',
        '',
        '```ts',
        '// a regular comment',
        'const a = 1',
        '```',
      ].join('\n'),
    )
  })
})
