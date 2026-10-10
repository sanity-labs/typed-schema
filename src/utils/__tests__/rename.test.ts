import {expect, test} from 'vitest'

import {document} from '../../creators/document'
import {literal} from '../../creators/literal'
import {object} from '../../creators/object'
import {string} from '../../creators/string'
import {parse} from '../../parse'
import {rename} from '../rename'

test('rename a document type', () => {
  const doc = document({
    _type: literal('something'),
    foo: string(),
  })
  const RenamedDoc = rename(doc, 'renamed')
  const res = parse(RenamedDoc, {
    _id: 'some-id',
    _type: 'renamed',
    foo: 'Foo',
  })
  expect(res).toEqual({
    _id: 'some-id',
    _type: 'renamed',
    foo: 'Foo',
  })
})

test('rename an object type from an object', () => {
  const obj = object({
    _type: literal('something'),
    foo: string(),
  })
  const res = parse(rename(obj, 'otherthing'), {
    _type: 'otherthing',
    foo: 'Foo',
  })
  expect(res).toEqual({
    _type: 'otherthing',
    foo: 'Foo',
  })
})
