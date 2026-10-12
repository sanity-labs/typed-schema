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
   * schemas; for anything else the schema's own type is returned. `type` is
   * null when the file has no default export.
   *
   * With `refSchema`, the type is `Parsed<>` instead of `Infer<>`, which
   * includes the `$refSchema` key that `parse` adds to reference values.
   * `hasRefSchema` reports whether the type has any, so the toggle is only
   * offered when it changes something.
   */
  inferredType(
    path: string,
    lifecycle: Lifecycle,
    refSchema: boolean,
  ): {type: string | null; isDocument: boolean; hasRefSchema: boolean} {
    const env = base.getEnv()
    const header = [
      `import type schema from '.${path.replace(/\.ts$/, '')}'`,
      `import {committed, type Infer, type Parsed, partial} from '@sanity-labs/typed-schema'`,
      `declare const X: typeof schema`,
    ]
    const isDocument = !hasErrors(env, IS_DOCUMENT_PATH, [
      ...header,
      'partial(X)',
    ])
    const value = isDocument ? lifecycleCode(lifecycle, 'X') : 'X'
    const parsed = printType(env, header, value, 'Parsed')
    const hasRefSchema = parsed?.includes(REF_SCHEMA_MEMBER) ?? false
    return {
      type:
        refSchema || !hasRefSchema
          ? parsed
          : printType(env, header, value, 'Infer'),
      isDocument,
      hasRefSchema,
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

// How a $refSchema member starts in a printed type
const REF_SCHEMA_MEMBER = '$refSchema:'
// Names from the package are not in scope in the helper module, so
// TypeScript qualifies them with an import type
const PACKAGE_QUALIFIER = 'import("@sanity-labs/typed-schema").'

/**
 * The expanded `wrapper<typeof value>` type, where `value` is an expression
 * over the header's names. Null when the module has type errors, for example
 * when the playground file has no default export.
 */
function printType(
  env: ReturnType<typeof base.getEnv>,
  header: string[],
  value: string,
  wrapper: 'Infer' | 'Parsed',
): string | null {
  const lines = [
    ...header,
    `const value = ${value}`,
    `type ${INFERRED_NAME} = ${wrapper}<typeof value>`,
    '',
  ]
  if (hasErrors(env, INFERRED_PATH, lines)) return null
  const code = lines.join('\n')
  const info = env.languageService.getQuickInfoAtPosition(
    INFERRED_PATH,
    code.lastIndexOf(INFERRED_NAME),
  )
  const text = ts.displayPartsToString(info?.displayParts)
  const prefix = `type ${INFERRED_NAME} = `
  return text.startsWith(prefix)
    ? sortSystemFields(
        text.slice(prefix.length).replaceAll(PACKAGE_QUALIFIER, ''),
      )
    : null
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
