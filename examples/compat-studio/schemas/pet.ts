import {image, object, string} from '@sanity-labs/typed-schema'

export const pet = object({
  name: string(),
  image: image({caption: string()}),
})
