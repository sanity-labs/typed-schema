import * as typedSchema from '@sanity-labs/typed-schema'

import {parseInput} from './hujson'
import {applyLifecycle, type Lifecycle} from './lifecycle'
import {type RunResult} from './runResult'

/**
 * Evaluates transpiled playground code and validates the JSON input against
 * its default export. Runs inside the run worker (see runner.ts).
 */
export function runCode(
  js: string,
  json: string,
  lifecycle: Lifecycle,
): RunResult {
  const parsed = parseInput(json)
  if (!parsed.ok) return {status: 'invalid-json', message: parsed.message}
  const input = parsed.value

  const module: {exports: Record<string, unknown>} = {exports: {}}
  const require = (name: string) => {
    if (name === '@sanity-labs/typed-schema') return typedSchema
    throw new Error(
      `Only @sanity-labs/typed-schema can be imported in the playground, not "${name}"`,
    )
  }
  try {
    // oxlint-disable-next-line no-new-func -- evaluating the playground code is the point
    new Function('require', 'module', 'exports', js)(
      require,
      module,
      module.exports,
    )
  } catch (err) {
    return {status: 'error', message: errorMessage(err)}
  }

  const exported = module.exports.default
  if (!isSchema(exported)) return {status: 'no-schema'}

  try {
    // partial() and committed() only apply to document schemas, as in the
    // type view
    const schema = isDocumentSchema(exported)
      ? applyLifecycle(exported, lifecycle, {
          // the precise schema types don't matter here, only the runtime
          // schema that parse receives
          partial: document => typedSchema.partial(document) as typeof document,
          committed: document =>
            typedSchema.committed(document) as unknown as typeof document,
        })
      : exported
    const result = typedSchema.parse(schema, input)
    return result.ok
      ? {status: 'ok', value: JSON.stringify(result.value, null, 2)}
      : {
          status: 'fail',
          errors: result.error.issues.map(({path, code, message}) => ({
            path,
            code,
            message,
          })),
        }
  } catch (err) {
    return {status: 'error', message: errorMessage(err)}
  }
}

function isDocumentSchema(
  value: typedSchema.Schema,
): value is typedSchema.DocumentSchema {
  return value.typeName === 'document'
}

function isSchema(value: unknown): value is typedSchema.Schema {
  return typeof value === 'object' && value !== null && 'typeName' in value
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
