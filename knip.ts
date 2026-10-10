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
  },
}

export default config
