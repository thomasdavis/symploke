/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  transpilePackages: ['@symploke/db', '@symploke/design', '@symploke/ui'],
  serverExternalPackages: ['@prisma/client', '@prisma/extension-accelerate', 'prisma'],
  outputFileTracingIncludes: {
    '/api/**/*': ['../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*'],
    '/**/*': ['../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*'],
  },
}
