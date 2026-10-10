import path from 'node:path'

import {defineConfig} from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3600,
  },
  resolve: {
    alias: {
      '@sanity-labs/typed-schema': path.resolve(__dirname, '../../src'),
    },
  },
})
