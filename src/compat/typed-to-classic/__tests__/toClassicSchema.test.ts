import {expect, test} from 'vitest'

import {toClassicSchema} from '../toClassicSchema'
import {classicHuman} from './schemas/classic'
import {Human} from './schemas/typed'

test('toClassicSchema', () => {
  expect(toClassicSchema(Human)).toEqual(classicHuman)
})
