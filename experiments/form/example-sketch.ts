import {document, literal, object, string} from '@sanity-labs/typed-schema'

import {defineForm} from './creators'

const Pet = document({
  _type: literal('pet'),
  name: string(),
  tag: object({
    provider: string(),
    id: string(),
  }),
})

const defaultStringForm = {title: 'String'}

const tagForm = {
  fields: {
    provider: {
      title: 'Provider',
      readonly: true,
      form: defaultStringForm,
    },
    id: {
      title: 'Provider',
      readonly: true,
      form: defaultStringForm,
    },
  },
}

const petForm = defineForm(Pet, {
  fields: {
    name: {
      title: 'Name',
      readonly: true,
    },
    tag: {
      ...tagForm,
      title: 'Tag',
      readonly: true,
    },
  },
})
