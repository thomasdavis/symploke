import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_GITHUB_APP_ID: z.string().min(1),
  AUTH_GITHUB_APP_PRIVATE_KEY: z.string().min(1),
  PUSHER_APP_ID: z.string().optional(),
  PUSHER_KEY: z.string().optional(),
  PUSHER_SECRET: z.string().optional(),
  PUSHER_CLUSTER: z.string().default('us2'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  // Queue settings
  QUEUE_POLL_INTERVAL_MS: z.coerce.number().default(5000),
  QUEUE_BATCH_SIZE: z.coerce.number().default(10),
  // Rate limit settings
  RATE_LIMIT_BUFFER: z.coerce.number().default(100), // Stop when this many requests left
  MAX_FILE_SIZE_BYTES: z.coerce.number().default(50 * 1024), // 50KB
})

function createConfig() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables')
  }
  return parsed.data
}

export const config = createConfig()

export type Config = z.infer<typeof envSchema>
