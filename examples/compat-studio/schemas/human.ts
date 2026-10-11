import {
  array,
  block,
  boolean,
  dateTime,
  document,
  extend,
  file,
  image,
  literal,
  number,
  object,
  string,
  union,
} from '@sanity-labs/typed-schema'

import {Pet} from './pet'

export const Human = document({
  _type: literal('human'),
  name: string(),
  profilePicture: image({
    caption: string(),
  }),
  favoriteTimestamp: dateTime(),
  address: object({
    street: string(),
    city: string(),
    country: string(),
  }),
  cv: file({
    description: string(),
  }),
  portableText: array(
    union([
      block({
        _type: literal('myCustomBlock'),
        style: union([literal('normal'), literal('h1'), literal('h2')]),
        list: union([literal('bullet'), literal('number')]),
        inline: union([
          object({
            _type: literal('author'),
            name: string(),
          }),
        ]),
        decorator: union([literal('strong'), literal('em')]),
        annotation: union([
          object({_type: literal('author'), foo: number()}),
          object({_type: literal('book'), bar: number()}),
        ]),
      }),
      image(),
    ]),
  ),
  pets: array(
    union([
      extend(Pet, {
        _type: literal('avine'),
        squeaks: boolean(),
      }),
      extend(Pet, {
        _type: literal('feline'),
        meows: boolean(),
      }),
      extend(Pet, {
        _type: literal('canine'),
        barks: boolean(),
      }),
    ]),
  ),
})
