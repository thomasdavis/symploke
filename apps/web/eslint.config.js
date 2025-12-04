import symplokeConfig from '@symploke/eslint-config'

export default [
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.turbo/**'],
  },
  ...symplokeConfig,
]
