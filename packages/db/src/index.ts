import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined
}

// Create a new PrismaClient with Accelerate extension
function createPrismaClient() {
  return new PrismaClient().$extends(withAccelerate())
}

// Get or create the Prisma client instance
function getPrismaClient(): ExtendedPrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Please configure it in your environment.',
    )
  }
  return globalForPrisma.prisma ?? createPrismaClient()
}

export const db: ExtendedPrismaClient = getPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

export * from '@prisma/client'
