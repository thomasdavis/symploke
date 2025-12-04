import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy initialization - only create client when DATABASE_URL is available
function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Please configure it in your environment.',
    )
  }
  return new PrismaClient().$extends(withAccelerate())
}

export const db =
  globalForPrisma.prisma ??
  (process.env.DATABASE_URL ? createPrismaClient() : ({} as any))

if (process.env.NODE_ENV !== 'production' && process.env.DATABASE_URL) {
  globalForPrisma.prisma = db as PrismaClient
}

export * from '@prisma/client'
