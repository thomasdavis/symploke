/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  transpilePackages: ['@symploke/ui'],
  outputFileTracingIncludes: {
    '/api/**/*': ['../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*'],
    '/**/*': ['../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*'],
  },
}
