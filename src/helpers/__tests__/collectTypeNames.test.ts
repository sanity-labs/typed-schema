import {expect, test} from 'vitest'

import {literal} from '../../creators/literal'
import {object} from '../../creators/object'
import {collectTypeNames} from '../verifyUniqueTypeNames'

test('collectTypeNames', () => {
  expect(
    collectTypeNames(
      object({_type: literal('foo'), inner: object({_type: literal('foo')})}),
    ),
  ).toMatchInlineSnapshot(`
      {
        "foo": {
          "name": "foo",
          "paths": [
            [],
            [
              "inner",
            ],
          ],
        },
      }
    `)
})
