import {describe, expect, test} from 'vitest'

import {sortSystemFields} from './sortSystemFields'

describe('sortSystemFields', () => {
  test('moves system fields first, in a fixed order', () => {
    const text = [
      'const fido: {',
      '    name: string;',
      '    _rev?: string | undefined;',
      '    _type: "pet";',
      '    birthYear?: number | undefined;',
      '    _id?: string | undefined;',
      '}',
    ].join('\n')
    expect(sortSystemFields(text)).toBe(
      [
        'const fido: {',
        '    _type: "pet";',
        '    _id?: string | undefined;',
        '    _rev?: string | undefined;',
        '    name: string;',
        '    birthYear?: number | undefined;',
        '}',
      ].join('\n'),
    )
  })

  test('sorts nested objects too, keeping them with their member', () => {
    const text = [
      'type Event = {',
      '    slug: {',
      '        current: string;',
      '        _type: "slug";',
      '    };',
      '    _type: "event";',
      '    venue?: {',
      '        _ref: string;',
      '        _type: "reference";',
      '    } | undefined;',
      '}',
    ].join('\n')
    expect(sortSystemFields(text)).toBe(
      [
        'type Event = {',
        '    _type: "event";',
        '    slug: {',
        '        _type: "slug";',
        '        current: string;',
        '    };',
        '    venue?: {',
        '        _type: "reference";',
        '        _ref: string;',
        '    } | undefined;',
        '}',
      ].join('\n'),
    )
  })

  test('puts _key after _type in array elements and union members', () => {
    const text = [
      'type Cells = ({',
      '    amount: number;',
      '    _type: "price";',
      '    _key: string;',
      '} | {',
      '    text: string;',
      '    _key: string;',
      '    _type: "note";',
      '})[]',
    ].join('\n')
    expect(sortSystemFields(text)).toBe(
      [
        'type Cells = ({',
        '    _type: "price";',
        '    _key: string;',
        '    amount: number;',
        '} | {',
        '    _type: "note";',
        '    _key: string;',
        '    text: string;',
        '})[]',
      ].join('\n'),
    )
  })

  test('moves other fields starting with _ after the known system fields', () => {
    expect(
      sortSystemFields(
        '{\n    a: 1;\n    _originalId: string;\n    _id: string;\n}',
      ),
    ).toBe('{\n    _id: string;\n    _originalId: string;\n    a: 1;\n}')
  })

  test('sorts a bare object type, as shown in the playground', () => {
    expect(sortSystemFields('{\n    a: 1;\n    _id: string;\n}')).toBe(
      '{\n    _id: string;\n    a: 1;\n}',
    )
  })

  test('returns text without a multi-line object unchanged', () => {
    for (const text of [
      'type Tags = string[]',
      'const x: { a: 1; _id: string; }',
      'function parse<T>(schema: T): Parsed<T>',
    ]) {
      expect(sortSystemFields(text)).toBe(text)
    }
  })
})
