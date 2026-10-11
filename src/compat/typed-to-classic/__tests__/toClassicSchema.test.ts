import {expect, test} from 'vitest'

import {block} from '../../../creators/block'
import {document} from '../../../creators/document'
import {image} from '../../../creators/image'
import {literal} from '../../../creators/literal'
import {portableText} from '../../../creators/portableText'
import {reference} from '../../../creators/reference'
import {string} from '../../../creators/string'
import {union} from '../../../creators/union'
import {toClassicSchema} from '../toClassicSchema'
import {classicHuman} from './schemas/classic'
import {Human} from './schemas/typed'

test('toClassicSchema', () => {
  expect(toClassicSchema(Human)).toEqual(classicHuman)
})

test('images and references in Portable Text', () => {
  const Author = document({_type: literal('author'), name: string()})
  const Article = document({
    _type: literal('article'),
    body: portableText({
      block: block({inline: reference(Author)}),
      element: union([image({alt: string()}), reference(Author)]),
    }),
  })

  expect(toClassicSchema(Article)).toEqual([
    {
      type: 'document',
      name: 'article',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
              name: 'block',
              of: [
                {
                  type: 'object',
                  name: 'span',
                  fields: [
                    {name: 'marks', type: 'array', of: [{type: 'string'}]},
                    {name: 'text', type: 'string'},
                  ],
                },
                {type: 'reference', to: {type: 'author'}},
              ],
            },
            {
              type: 'image',
              name: 'image',
              fields: [{name: 'alt', type: 'string'}],
            },
            {type: 'reference', to: {type: 'author'}},
          ],
        },
      ],
    },
  ])
})
