import {createSystem, createVirtualTypeScriptEnvironment} from '@typescript/vfs'
import {createWorker} from '@valtown/codemirror-ts/worker'
import * as Comlink from 'comlink'
import ts from 'typescript'
import files from 'virtual:playground-types'

import {withFullQuickInfo} from '../quickInfo.ts'
import {sortSystemFields} from '../sortSystemFields.ts'
import {type Lifecycle, lifecycleCode} from './lifecycle.ts'

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['es2023'],
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  types: [],
}

// Helper modules: one names the inferred type of the playground code's
// default export, so its expanded form can be read with quick info; the
// other checks whether the default export is a document schema, which is
// what partial() and committed() accept.
const INFERRED_PATH = '/__inferred.ts'
const INFERRED_NAME = 'Inferred'
const IS_DOCUMENT_PATH = '/__is-document.ts'

const base = createWorker(() => {
  const system = createSystem(new Map(Object.entries(files)))
  const env = createVirtualTypeScriptEnvironment(
    system,
    ['/globals.d.ts'],
    ts,
    compilerOptions,
  )
  env.languageService = withFullQuickInfo(env.languageService)
  return env
})

const worker = {
  ...base,
  /**
   * The expanded inferred type of a playground file's default export, with
   * partial() and/or committed() applied. These only apply to document
   * schemas; for anything else the schema's own type is returned. `type` is null when the
   * file has no default export.
   */
  inferredType(
    path: string,
    lifecycle: Lifecycle,
  ): {type: string | null; isDocument: boolean} {
    const env = base.getEnv()
    const header = [
      `import type schema from '.${path.replace(/\.ts$/, '')}'`,
      `import {committed, type Infer, partial} from '@sanity-labs/typed-schema'`,
      `declare const X: typeof schema`,
    ]
    const isDocument = !hasErrors(env, IS_DOCUMENT_PATH, [
      ...header,
      'partial(X)',
    ])
    const code = [
      ...header,
      `const value = ${isDocument ? lifecycleCode(lifecycle, 'X') : 'X'}`,
      `type ${INFERRED_NAME} = Infer<typeof value>`,
      '',
    ].join('\n')
    if (hasErrors(env, INFERRED_PATH, code.split('\n'))) {
      return {type: null, isDocument}
    }
    const info = env.languageService.getQuickInfoAtPosition(
      INFERRED_PATH,
      code.lastIndexOf(INFERRED_NAME),
    )
    const text = ts.displayPartsToString(info?.displayParts)
    const prefix = `type ${INFERRED_NAME} = `
    return {
      type: text.startsWith(prefix)
        ? sortSystemFields(text.slice(prefix.length))
        : null,
      isDocument,
    }
  },
  /**
   * Compiles playground code to CommonJS so the runner can evaluate it with
   * a `require` that only knows about @sanity-labs/typed-schema. Type errors
   * are ignored here; the editor reports them.
   */
  transpile(code: string): string {
    return ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
  },
}

/** Writes a helper module and reports whether it has type errors */
function hasErrors(
  env: ReturnType<typeof base.getEnv>,
  path: string,
  lines: string[],
): boolean {
  const code = lines.join('\n')
  if (env.getSourceFile(path)) env.updateFile(path, code)
  else env.createFile(path, code)
  return env.languageService.getSemanticDiagnostics(path).length > 0
}

export type PlaygroundWorker = Comlink.Remote<typeof worker>

Comlink.expose(worker)
