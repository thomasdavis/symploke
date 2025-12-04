import baseConfig from '@symploke/tailwind-config'

export default {
  ...baseConfig,
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
}
