import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Module boundary rules
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@symploke/*/index'],
              message: 'No barrel exports allowed. Import directly from source files.',
            },
          ],
        },
      ],
    },
  },
]
