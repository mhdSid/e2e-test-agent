import stylistic from '@stylistic/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default [
  {
    ignores: ['**/node_modules/**', 'e2e-artifacts/**', 'example/**', 'output/**']
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/space-before-function-paren': ['error', 'always']
    }
  }
]
