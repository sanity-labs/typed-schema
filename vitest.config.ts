import {configDefaults, defineConfig} from 'vitest/config'

// experiments/ has its own tests; keep them out of the package suite
const EXCLUDE = ['.tmp/**', 'experiments/**']

export default defineConfig({
  // the docs tests import the package by name; resolve it to src/ through the
  // `source` export condition, so tests don't depend on a build in dist/
  ssr: {resolve: {conditions: ['source']}},
  test: {
    setupFiles: ['./src/__tests__/setup.ts'],
    typecheck: {
      exclude: [...(configDefaults.typecheck?.exclude || []), ...EXCLUDE],
    },
    exclude: [...configDefaults.exclude, ...EXCLUDE],
    coverage: {
      reporter: ['text-summary', 'json-summary', 'json'],
      reportOnFailure: true,
      include: ['src/**'],
    },
  },
})
