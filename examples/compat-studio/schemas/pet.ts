import {image, object, string} from '@sanity-labs/typed-schema'

export const Pet = object({
  name: string(),
  image: image({caption: string()}),
})
