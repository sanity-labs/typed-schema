import {assert, expect, test} from 'vitest'

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
  const resResult = parse(RenamedDoc, {
    _id: 'some-id',
    _type: 'renamed',
    foo: 'Foo',
  })
  assert(resResult.ok)
  const res = resResult.value
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
  const resResult = parse(rename(obj, 'otherthing'), {
    _type: 'otherthing',
    foo: 'Foo',
  })
  assert(resResult.ok)
  const res = resResult.value
  expect(res).toEqual({
    _type: 'otherthing',
    foo: 'Foo',
  })
})
