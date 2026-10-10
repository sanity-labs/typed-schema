import {defineConfig} from 'oxlint'

export default defineConfig({
  plugins: ['typescript', 'import', 'oxc'],
  categories: {
    correctness: 'error',
    suspicious: 'warn',
  },
  rules: {
    'no-console': 'error',
    'no-shadow': 'error',
    'no-unused-vars': [
      'warn',
      {argsIgnorePattern: '^_', varsIgnorePattern: '^_', args: 'after-used'},
    ],
    // Sanity system fields (_type, _id, _ref, _key, ...) use leading underscores
    'no-underscore-dangle': 'off',
    'typescript/consistent-type-imports': ['error', {prefer: 'type-imports'}],
    'typescript/no-explicit-any': 'off',
    'typescript/no-empty-interface': 'off',
    'typescript/no-dupe-class-members': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': ['error', {preferInline: true}],
    'import/consistent-type-specifier-style': ['error', 'prefer-inline'],
    'import/no-nodejs-modules': 'warn',
  },
  overrides: [
    {
      // scratch/demo files: unused variables and types are the point
      files: ['examples/**', 'exploration/**'],
      rules: {
        'no-unused-vars': 'off',
      },
    },
    {
      files: [
        'examples/**',
        'exploration/**',
        'scripts/**',
        '**/*.test.ts',
        '**/*.test-d.ts',
      ],
      rules: {
        'no-console': 'off',
        'import/no-nodejs-modules': 'off',
      },
    },
  ],
  ignorePatterns: ['dist', 'coverage', '.tmp', 'tmp', '**/.*/**'],
})
