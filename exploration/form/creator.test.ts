import {test} from 'vitest'

import {array} from '../../src/creators/array'
import {document} from '../../src/creators/document'
import {literal} from '../../src/creators/literal'
import {object} from '../../src/creators/object'
import {string} from '../../src/creators/string'
import {union} from '../../src/creators/union'
import {defineForm} from './creators'

const person = document({
  _type: literal('person'),
  firstName: string(),
  lastName: string(),
  addresses: array(
    union([
      object({
        _type: literal('address'),
        street: string(),
        city: string(),
        country: string(),
      }),
      object({
        _type: literal('location'),
        street: string(),
        city: string(),
        country: string(),
      }),
    ]),
  ),
})

test('define a basic nested form', () => {
  defineForm(person, {
    fields: {
      firstName: {
        title: 'Name',
        readonly: true,
      },
      lastName: {
        title: 'Tag',
        readonly: true,
      },
      addresses: {
        title: 'test',
        readonly: true,
        draggable: true,
        items: {
          location: {
            title: 'Location',
            fields: {
              city: {title: 'City'},
              country: {title: 'Country'},
              street: {title: 'Street'},
            },
          },
          address: {
            fields: {
              city: {title: 'City'},
              country: {title: 'Country'},
              street: {title: 'Street'},
            },
          },
        },
      },
    },
  })
})
