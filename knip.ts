import {type KnipConfig} from 'knip'

const config: KnipConfig = {
  rules: {
    exports: 'warn',
    types: 'warn',
    enumMembers: 'warn',
  },
  // TODO: delete these two dead files (leftover from the old "builders"
  // approach, see git history) and drop this ignore
  ignore: ['src/creators/builder.ts', 'src/creators/index.ts'],
  workspaces: {
    '.': {
      // examples/{ts,forms,content-migration} and exploration/ are loose
      // scratch folders without their own package.json, so they resolve
      // against the root dependencies
      entry: [
        'taze.config.ts',
        'scripts/*.js',
        'exploration/*.ts',
        'examples/{ts,forms,content-migration}/**/*.{ts,tsx}',
      ],
      project: [
        'src/**/*.ts',
        'scripts/*.js',
        'exploration/*.ts',
        'examples/{ts,forms,content-migration}/**/*.{ts,tsx}',
      ],
    },
  },
}

export default config
