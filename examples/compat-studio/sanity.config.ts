import {toClassicSchema} from '@sanity-labs/typed-schema'
import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {deskTool} from 'sanity/desk'

import {human} from './schemas/human'

export default defineConfig({
  name: 'default',
  title: 'Sanity Classic (v3) Studio',

  projectId: 'ppsg7ml5',
  dataset: 'production',

  plugins: [deskTool(), visionTool()],

  schema: {
    types: toClassicSchema(human),
  },
})
