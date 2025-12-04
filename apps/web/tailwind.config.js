import baseConfig from '@symploke/tailwind-config'

export default {
  ...baseConfig,
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme?.extend,
      fontFamily: {
        sora: ['var(--font-sora)', 'sans-serif'],
        sen: ['var(--font-sen)', 'sans-serif'],
        'azeret-mono': ['var(--font-azeret-mono)', 'monospace'],
      },
    },
  },
}
