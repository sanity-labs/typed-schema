import {expect, test} from 'vitest'

import {isExtendableObjectSchema} from '../asserters'
import {block} from '../creators/block'
import {document} from '../creators/document'
import {file} from '../creators/file'
import {image} from '../creators/image'
import {literal} from '../creators/literal'
import {object} from '../creators/object'
import {reference} from '../creators/reference'
import {string} from '../creators/string'

test('isExtendableObjectSchema matches objects, documents and assets', () => {
  const Pet = document({_type: literal('pet')})

  expect(isExtendableObjectSchema(object({name: string()}))).toBe(true)
  expect(isExtendableObjectSchema(Pet)).toBe(true)
  expect(isExtendableObjectSchema(image())).toBe(true)
  expect(isExtendableObjectSchema(file())).toBe(true)

  expect(isExtendableObjectSchema(reference(Pet))).toBe(false)
  expect(isExtendableObjectSchema(block({}))).toBe(false)
  expect(isExtendableObjectSchema(string())).toBe(false)
})
