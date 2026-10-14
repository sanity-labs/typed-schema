import {expect, test} from 'vitest'

import {fileAsset} from '../creators/fileAsset'
import {imageAsset} from '../creators/imageAsset'
import {getAnnotations} from '../helpers/annotations'

test('imageAsset() and fileAsset() return the built-in asset document types', () => {
  expect(imageAsset()).toBe(imageAsset())
  expect(fileAsset()).toBe(fileAsset())
  expect(imageAsset().shape._type.value).toBe('sanity.imageAsset')
  expect(fileAsset().shape._type.value).toBe('sanity.fileAsset')
})

test('annotations go on a copy, leaving the built-in type unchanged', () => {
  const Photo = imageAsset({title: 'Photo'})
  const Attachment = fileAsset({title: 'Attachment'})

  expect(getAnnotations(Photo)).toMatchObject({title: 'Photo'})
  expect(getAnnotations(Attachment)).toMatchObject({title: 'Attachment'})
  expect(Photo.shape).toBe(imageAsset().shape)
  expect(Attachment.shape).toBe(fileAsset().shape)
  expect(getAnnotations(imageAsset())).toBeUndefined()
  expect(getAnnotations(fileAsset())).toBeUndefined()
})
