import {runCode} from './runCode'
import {type RunRequest} from './runResult'

// Runs in a worker of its own for each run, so a slow or looping schema
// module can be terminated without taking down the TypeScript worker.
self.addEventListener('message', (event: MessageEvent<RunRequest>) => {
  const {js, json, lifecycle} = event.data
  self.postMessage(runCode(js, json, lifecycle))
})
