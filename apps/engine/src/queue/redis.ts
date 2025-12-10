import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq'
import { logger } from '@symploke/logger'
import { config } from '../config'

// Redis connection config from environment
function getRedisConnection(): ConnectionOptions {
  const redisUrl = process.env.REDIS_URL

  if (redisUrl) {
    // Parse Redis URL (redis://user:password@host:port)
    const url = new URL(redisUrl)
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      username: url.username || undefined,
    }
  }

  // Fallback to individual env vars (Railway style)
  return {
    host: process.env.REDISHOST || 'localhost',
    port: parseInt(process.env.REDISPORT || '6379', 10),
    password: process.env.REDISPASSWORD || process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDISUSER || 'default',
  }
}

// Queue names
export const QUEUE_NAMES = {
  SYNC: 'repo-sync',
  EMBED: 'repo-embed',
  WEAVE: 'weave-discovery',
} as const

// Job data types
export interface SyncJobData {
  repoId: string
  triggeredBy: 'manual' | 'hourly' | 'repo-created'
}

export interface EmbedJobData {
  repoId: string
  triggeredBy: 'manual' | 'post-sync'
}

export interface WeaveJobData {
  plexusId: string
  triggeredBy: 'manual' | 'scheduled'
}

// Singleton queues
let syncQueue: Queue<SyncJobData> | null = null
let embedQueue: Queue<EmbedJobData> | null = null
let weaveQueue: Queue<WeaveJobData> | null = null

const connection = getRedisConnection()

/**
 * Get or create the sync queue
 */
export function getSyncQueue(): Queue<SyncJobData> {
  if (!syncQueue) {
    syncQueue = new Queue<SyncJobData>(QUEUE_NAMES.SYNC, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60, // Keep completed jobs for 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
        },
      },
    })
    logger.info('Sync queue initialized')
  }
  return syncQueue
}

/**
 * Get or create the embed queue
 */
export function getEmbedQueue(): Queue<EmbedJobData> {
  if (!embedQueue) {
    embedQueue = new Queue<EmbedJobData>(QUEUE_NAMES.EMBED, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60,
        },
      },
    })
    logger.info('Embed queue initialized')
  }
  return embedQueue
}

/**
 * Get or create the weave discovery queue
 */
export function getWeaveQueue(): Queue<WeaveJobData> {
  if (!weaveQueue) {
    weaveQueue = new Queue<WeaveJobData>(QUEUE_NAMES.WEAVE, {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 100,
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60,
        },
      },
    })
    logger.info('Weave queue initialized')
  }
  return weaveQueue
}

/**
 * Add a sync job to the queue
 */
export async function addSyncJob(
  repoId: string,
  triggeredBy: SyncJobData['triggeredBy'] = 'manual',
): Promise<Job<SyncJobData>> {
  const queue = getSyncQueue()

  // Use repoId as job ID to prevent duplicate jobs for same repo
  const job = await queue.add(
    'sync',
    { repoId, triggeredBy },
    {
      jobId: `sync-${repoId}`,
      // Don't add if same job exists and is waiting/active
    },
  )

  logger.info({ repoId, jobId: job.id, triggeredBy }, 'Added sync job to queue')
  return job
}

/**
 * Add an embed job to the queue
 */
export async function addEmbedJob(
  repoId: string,
  triggeredBy: EmbedJobData['triggeredBy'] = 'manual',
): Promise<Job<EmbedJobData>> {
  const queue = getEmbedQueue()

  const job = await queue.add(
    'embed',
    { repoId, triggeredBy },
    {
      jobId: `embed-${repoId}`,
    },
  )

  logger.info({ repoId, jobId: job.id, triggeredBy }, 'Added embed job to queue')
  return job
}

/**
 * Add a weave discovery job to the queue
 */
export async function addWeaveJob(
  plexusId: string,
  triggeredBy: WeaveJobData['triggeredBy'] = 'manual',
): Promise<Job<WeaveJobData>> {
  const queue = getWeaveQueue()

  const job = await queue.add(
    'weave',
    { plexusId, triggeredBy },
    {
      jobId: `weave-${plexusId}-${Date.now()}`,
    },
  )

  logger.info({ plexusId, jobId: job.id, triggeredBy }, 'Added weave job to queue')
  return job
}

/**
 * Create a worker for processing sync jobs
 */
export function createSyncWorker(
  processor: (job: Job<SyncJobData>) => Promise<void>,
): Worker<SyncJobData> {
  const worker = new Worker<SyncJobData>(QUEUE_NAMES.SYNC, processor, {
    connection,
    concurrency: config.SYNC_WORKER_CONCURRENCY,
  })

  logger.info({ concurrency: config.SYNC_WORKER_CONCURRENCY }, 'Sync worker started')

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, repoId: job.data.repoId }, 'Sync job completed')
  })

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, repoId: job?.data.repoId, error: err.message },
      'Sync job failed',
    )
  })

  return worker
}

/**
 * Create a worker for processing embed jobs
 */
export function createEmbedWorker(
  processor: (job: Job<EmbedJobData>) => Promise<void>,
): Worker<EmbedJobData> {
  const worker = new Worker<EmbedJobData>(QUEUE_NAMES.EMBED, processor, {
    connection,
    concurrency: config.EMBED_WORKER_CONCURRENCY,
  })

  logger.info({ concurrency: config.EMBED_WORKER_CONCURRENCY }, 'Embed worker started')

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, repoId: job.data.repoId }, 'Embed job completed')
  })

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, repoId: job?.data.repoId, error: err.message },
      'Embed job failed',
    )
  })

  return worker
}

/**
 * Create a worker for processing weave discovery jobs
 */
export function createWeaveWorker(
  processor: (job: Job<WeaveJobData>) => Promise<void>,
): Worker<WeaveJobData> {
  const worker = new Worker<WeaveJobData>(QUEUE_NAMES.WEAVE, processor, {
    connection,
    concurrency: config.WEAVE_WORKER_CONCURRENCY,
  })

  logger.info({ concurrency: config.WEAVE_WORKER_CONCURRENCY }, 'Weave worker started')

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, plexusId: job.data.plexusId }, 'Weave job completed')
  })

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, plexusId: job?.data.plexusId, error: err.message },
      'Weave job failed',
    )
  })

  return worker
}

/**
 * Schedule hourly sync for all repos
 */
export async function scheduleHourlySync(): Promise<void> {
  const queue = getSyncQueue()

  // Add a repeatable job that runs every hour
  await queue.add(
    'hourly-sync-trigger',
    { repoId: 'ALL', triggeredBy: 'hourly' },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour at minute 0
      },
      jobId: 'hourly-sync',
    },
  )

  logger.info('Scheduled hourly sync job')
}

/**
 * Close all queue connections
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([syncQueue?.close(), embedQueue?.close(), weaveQueue?.close()])
  logger.info('All queues closed')
}
