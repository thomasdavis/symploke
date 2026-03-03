import type { DependencyCategory } from '@/types/dependency'

const CATEGORY_PATTERNS: [RegExp, DependencyCategory][] = [
  // Frameworks
  [/^(react|react-dom|next|vue|nuxt|svelte|angular|@angular\/.*)$/, 'framework'],
  [/^(express|fastify|koa|hapi|nest|@nestjs\/.*)$/, 'framework'],

  // UI
  [/^(@radix-ui\/.*|@headlessui\/.*|@base-ui-components\/.*|@mui\/.*|antd|chakra)/, 'ui'],
  [/^(tailwindcss|postcss|autoprefixer|sass|less|styled-components|emotion)/, 'ui'],

  // Testing
  [/^(jest|vitest|mocha|chai|sinon|@testing-library\/.*|cypress|playwright)/, 'testing'],
  [/^(nyc|istanbul|c8|@vitest\/.*)$/, 'testing'],

  // Build tools
  [/^(webpack|vite|esbuild|rollup|parcel|turbo|tsup|unbuild)/, 'build'],
  [/^(typescript|@swc\/.*|babel|@babel\/.*)$/, 'build'],

  // Types
  [/^@types\//, 'types'],

  // Lint / format
  [/^(eslint|prettier|biome|@biomejs\/.*|@eslint\/.*|eslint-.*|prettier-.*)/, 'lint'],

  // Data
  [/^(@prisma\/.*|prisma|mongoose|sequelize|typeorm|drizzle|knex|pg|mysql)/, 'data'],
  [/^(@tanstack\/.*query|swr|axios|node-fetch|got|ky|superagent)/, 'data'],

  // Security
  [/^(helmet|cors|csurf|rate-limiter|bcrypt|argon2|jsonwebtoken|jose)/, 'security'],

  // Utilities (broad catch)
  [/^(lodash|underscore|ramda|date-fns|dayjs|moment|uuid|nanoid|zod|yup|joi)/, 'utility'],
]

export function categorize(packageName: string): DependencyCategory {
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(packageName)) return category
  }
  return 'other'
}
