import path from 'node:path'

import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'ppsg7ml5',
    dataset: 'production',
  },
  vite: {
    server: {
      port: 3333,
    },
    resolve: {
      alias: {
        '@sanity-labs/typed-schema': path.resolve(__dirname, '../../src'),
      },
    },
  },
})
