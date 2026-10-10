import {configDefaults, defineConfig} from 'vitest/config'

// exploration/ holds scratch code with its own tests; keep it out of the suite
const EXCLUDE = ['.tmp/**', 'exploration/**']

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
