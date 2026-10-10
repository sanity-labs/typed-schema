import {configDefaults, defineConfig} from 'vitest/config'

// experiments/ has its own tests; keep them out of the package suite
const EXCLUDE = ['.tmp/**', 'experiments/**']

export default defineConfig({
  test: {
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
