import {type KnipConfig} from 'knip'

const config: KnipConfig = {
  rules: {
    exports: 'warn',
    types: 'warn',
    enumMembers: 'warn',
  },
  workspaces: {
    '.': {
      // examples/{ts,content-migration} and experiments/ are loose
      // scratch folders without their own package.json, so they resolve
      // against the root dependencies
      entry: [
        'taze.config.ts',
        'scripts/*.js',
        'experiments/**/*.ts',
        'examples/{ts,content-migration}/**/*.{ts,tsx}',
      ],
      project: [
        'src/**/*.ts',
        'scripts/*.js',
        'experiments/**/*.ts',
        'examples/{ts,content-migration}/**/*.{ts,tsx}',
      ],
    },
    docs: {
      // knip does not read Markdown: playground.md imports Playground.vue
      // and Twoslash examples import @sanity/client and Hono (whose
      // validator needs @standard-schema/spec). The two workers are loaded
      // with `new URL(...)`, which knip does not follow
      entry: [
        '.vitepress/playground/worker.ts',
        '.vitepress/playground/runner.ts',
        '.vitepress/playground/Playground.vue',
        '.vitepress/**/*.test.ts',
      ],
      project: ['.vitepress/**/*.{ts,vue}'],
      ignoreDependencies: [
        '@sanity/client',
        'hono',
        '@hono/standard-validator',
        '@standard-schema/spec',
      ],
    },
  },
}

export default config
