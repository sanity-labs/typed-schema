import ts from 'typescript'
import {describe, expect, test} from 'vitest'

import {presets} from './presets'
import {runCode} from './runCode'

// What each preset's input gives with the default lifecycle. Some show a
// failing input on purpose: the event has three problems, and the lifecycles
// draft has no name until Partial is selected
const EXPECTED_STATUS: Record<string, 'ok' | 'fail'> = {
  'api-response': 'ok',
  'blog-post': 'ok',
  constraints: 'ok',
  event: 'fail',
  lifecycles: 'fail',
  person: 'ok',
  'portable-text': 'ok',
}

// Transpiled the way the playground's TypeScript worker does it
function transpile(code: string): string {
  return ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
}

describe('presets', () => {
  test.each(presets.map(preset => [preset.id, preset] as const))(
    '%s runs and validates its input as expected',
    (id, preset) => {
      const result = runCode(transpile(preset.code), preset.json, {
        partial: false,
        committed: false,
      })
      expect(result.status).toBe(EXPECTED_STATUS[id])
    },
  )

  test('ids are unique', () => {
    const ids = presets.map(preset => preset.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
