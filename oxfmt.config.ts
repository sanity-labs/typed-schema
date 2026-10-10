import {defineConfig} from 'oxfmt'

export default defineConfig({
  printWidth: 80,
  semi: false,
  singleQuote: true,
  bracketSpacing: false,
  arrowParens: 'avoid',
  trailingComma: 'all',
  sortPackageJson: true,
  sortImports: {
    newlinesBetween: true,
  },
  ignorePatterns: [
    'dist',
    'coverage',
    '.tmp',
    'tmp',
    'CHANGELOG.md',
    'pnpm-lock.yaml',
  ],
})
