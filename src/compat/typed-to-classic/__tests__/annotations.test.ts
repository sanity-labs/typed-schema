import {expect, test} from 'vitest'

import {array} from '../../../creators/array'
import {document} from '../../../creators/document'
import {literal} from '../../../creators/literal'
import {object} from '../../../creators/object'
import {optional} from '../../../creators/optional'
import {string} from '../../../creators/string'
import {toClassicSchema} from '../toClassicSchema'

const Pet = document(
  {
    _type: literal('pet'),
    name: string({title: 'Name', description: 'Display name'}),
    nickname: optional(string({deprecated: 'Use name'})),
    slug: string({readOnly: true, guidelines: 'not mapped', examples: ['a']}),
    tags: array(string({title: 'Tag'}), {
      description: {en: 'Keywords', nb: 'Nøkkelord'},
    }),
    home: object({city: string()}, {title: 'Home'}),
  },
  {title: 'Pet', description: 'An animal'},
)

test('maps title, description, deprecated and readOnly to classic fields', () => {
  expect(toClassicSchema(Pet)).toEqual([
    {
      type: 'document',
      name: 'pet',
      title: 'Pet',
      description: 'An animal',
      fields: [
        {
          name: 'name',
          type: 'string',
          title: 'Name',
          description: 'Display name',
        },
        {name: 'nickname', type: 'string', deprecated: {reason: 'Use name'}},
        {name: 'slug', type: 'string', readOnly: true},
        {
          name: 'tags',
          type: 'array',
          description: 'Keywords',
          of: [{type: 'string', title: 'Tag'}],
        },
        {
          name: 'home',
          type: 'object',
          title: 'Home',
          fields: [{name: 'city', type: 'string'}],
        },
      ],
    },
  ])
})

test('resolves text in the requested locale', () => {
  const [pet] = toClassicSchema(Pet, {locale: 'nb'})
  const tags = (pet as any).fields.find((f: any) => f.name === 'tags')
  expect(tags.description).toBe('Nøkkelord')
})
