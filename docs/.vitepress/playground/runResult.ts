import {type ErrorCode, type Path} from '@sanity-labs/typed-schema'

import {type Lifecycle} from './lifecycle'

export interface RunRequest {
  js: string
  json: string
  lifecycle: Lifecycle
}

export interface RunError {
  path: Path
  code: ErrorCode
  message: string
}

export type RunResult =
  | {status: 'ok'; value: string}
  | {status: 'fail'; errors: RunError[]}
  | {status: 'invalid-json'; message: string}
  | {status: 'no-schema'}
  | {status: 'error'; message: string}
  | {status: 'timeout'}

const TIMEOUT_MS = 2000

/**
 * Runs transpiled playground code against JSON input. Each run gets a fresh
 * worker, so timers and globals from one run cannot affect the next. A run
 * that takes longer than two seconds is stopped, and starting a new run stops
 * the one before it.
 */
export function createRunner() {
  let stopCurrent: (() => void) | undefined

  return {
    /** Resolves to `null` when a newer run or `dispose()` stopped this one */
    run(js: string, json: string, lifecycle: Lifecycle) {
      stopCurrent?.()
      return new Promise<RunResult | null>(resolve => {
        const worker = new Worker(new URL('./runner.ts', import.meta.url), {
          type: 'module',
        })
        const timer = setTimeout(() => finish({status: 'timeout'}), TIMEOUT_MS)
        function finish(result: RunResult | null) {
          clearTimeout(timer)
          worker.terminate()
          if (stopCurrent === stop) stopCurrent = undefined
          resolve(result)
        }
        const stop = () => finish(null)
        stopCurrent = stop
        worker.addEventListener('message', (event: MessageEvent<RunResult>) =>
          finish(event.data),
        )
        // an uncaught error, for example from a timer the code set, or a
        // worker that failed to load
        worker.addEventListener('error', event => {
          event.preventDefault()
          finish({
            status: 'error',
            message: event.message || 'The validation worker failed to load',
          })
        })
        worker.postMessage({js, json, lifecycle} satisfies RunRequest)
      })
    },
    dispose() {
      stopCurrent?.()
    },
  }
}
