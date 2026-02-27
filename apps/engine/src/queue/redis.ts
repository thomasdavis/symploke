import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq'
import { logger } from '@symploke/logger'
import { config } from '../config.js'

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
  MATES_CRAWL: 'mates-crawl',
  MATES_PROFILE: 'mates-profile',
  MATES_EMBED: 'mates-embed',
  MATES_MATCH: 'mates-match',
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

export interface MatesJobData {
  profileId: string
  username: string
}

// Singleton queues
let syncQueue: Queue<SyncJobData> | null = null
let embedQueue: Queue<EmbedJobData> | null = null
let weaveQueue: Queue<WeaveJobData> | null = null
let matesCrawlQueue: Queue<MatesJobData> | null = null
let matesProfileQueue: Queue<MatesJobData> | null = null
let matesEmbedQueue: Queue<MatesJobData> | null = null
let matesMatchQueue: Queue<MatesJobData> | null = null

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
      // Include timestamp to avoid BullMQ deduplication silently skipping jobs
      jobId: `embed-${repoId}-${Date.now()}`,
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

  // Use a stable jobId per plexus to prevent duplicate jobs being queued
  // BullMQ will reject jobs with the same jobId that are already in queue
  const jobId = `weave-${plexusId}`

  // Check if job already exists in queue (waiting, active, or delayed)
  const existingJob = await queue.getJob(jobId)
  if (existingJob) {
    const state = await existingJob.getState()
    if (state === 'waiting' || state === 'active' || state === 'delayed') {
      logger.info({ plexusId, jobId, state }, 'Weave job already in queue, skipping')
      return existingJob
    }
    // If the job is completed/failed, remove it so we can add a new one
    await existingJob.remove()
  }

  const job = await queue.add(
    'weave',
    { plexusId, triggeredBy },
    {
      jobId,
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

// === Mates Queues ===

function getMatesQueueOptions() {
  return {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential' as const,
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
  }
}

export function getMatesCrawlQueue(): Queue<MatesJobData> {
  if (!matesCrawlQueue) {
    matesCrawlQueue = new Queue<MatesJobData>(QUEUE_NAMES.MATES_CRAWL, getMatesQueueOptions())
    logger.info('Mates crawl queue initialized')
  }
  return matesCrawlQueue
}

export function getMatesProfileQueue(): Queue<MatesJobData> {
  if (!matesProfileQueue) {
    matesProfileQueue = new Queue<MatesJobData>(QUEUE_NAMES.MATES_PROFILE, getMatesQueueOptions())
    logger.info('Mates profile queue initialized')
  }
  return matesProfileQueue
}

export function getMatesEmbedQueue(): Queue<MatesJobData> {
  if (!matesEmbedQueue) {
    matesEmbedQueue = new Queue<MatesJobData>(QUEUE_NAMES.MATES_EMBED, getMatesQueueOptions())
    logger.info('Mates embed queue initialized')
  }
  return matesEmbedQueue
}

export function getMatesMatchQueue(): Queue<MatesJobData> {
  if (!matesMatchQueue) {
    matesMatchQueue = new Queue<MatesJobData>(QUEUE_NAMES.MATES_MATCH, getMatesQueueOptions())
    logger.info('Mates match queue initialized')
  }
  return matesMatchQueue
}

export async function addMatesCrawlJob(
  profileId: string,
  username: string,
): Promise<Job<MatesJobData>> {
  const queue = getMatesCrawlQueue()
  const job = await queue.add(
    'mates-crawl',
    { profileId, username },
    {
      jobId: `mates-crawl-${profileId}`,
    },
  )
  logger.info({ profileId, username, jobId: job.id }, 'Added mates crawl job')
  return job
}

export async function addMatesProfileJob(
  profileId: string,
  username: string,
): Promise<Job<MatesJobData>> {
  const queue = getMatesProfileQueue()
  const job = await queue.add(
    'mates-profile',
    { profileId, username },
    {
      jobId: `mates-profile-${profileId}-${Date.now()}`,
    },
  )
  logger.info({ profileId, username, jobId: job.id }, 'Added mates profile job')
  return job
}

export async function addMatesEmbedJob(
  profileId: string,
  username: string,
): Promise<Job<MatesJobData>> {
  const queue = getMatesEmbedQueue()
  const job = await queue.add(
    'mates-embed',
    { profileId, username },
    {
      jobId: `mates-embed-${profileId}-${Date.now()}`,
    },
  )
  logger.info({ profileId, username, jobId: job.id }, 'Added mates embed job')
  return job
}

export async function addMatesMatchJob(
  profileId: string,
  username: string,
): Promise<Job<MatesJobData>> {
  const queue = getMatesMatchQueue()
  const job = await queue.add(
    'mates-match',
    { profileId, username },
    {
      jobId: `mates-match-${profileId}-${Date.now()}`,
    },
  )
  logger.info({ profileId, username, jobId: job.id }, 'Added mates match job')
  return job
}

export function createMatesCrawlWorker(
  processor: (job: Job<MatesJobData>) => Promise<void>,
): Worker<MatesJobData> {
  const worker = new Worker<MatesJobData>(QUEUE_NAMES.MATES_CRAWL, processor, {
    connection,
    concurrency: 2,
  })
  logger.info('Mates crawl worker started')
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, profileId: job.data.profileId }, 'Mates crawl job completed')
  })
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Mates crawl job failed')
  })
  return worker
}

export function createMatesProfileWorker(
  processor: (job: Job<MatesJobData>) => Promise<void>,
): Worker<MatesJobData> {
  const worker = new Worker<MatesJobData>(QUEUE_NAMES.MATES_PROFILE, processor, {
    connection,
    concurrency: 2,
  })
  logger.info('Mates profile worker started')
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, profileId: job.data.profileId }, 'Mates profile job completed')
  })
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Mates profile job failed')
  })
  return worker
}

export function createMatesEmbedWorker(
  processor: (job: Job<MatesJobData>) => Promise<void>,
): Worker<MatesJobData> {
  const worker = new Worker<MatesJobData>(QUEUE_NAMES.MATES_EMBED, processor, {
    connection,
    concurrency: 2,
  })
  logger.info('Mates embed worker started')
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, profileId: job.data.profileId }, 'Mates embed job completed')
  })
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Mates embed job failed')
  })
  return worker
}

export function createMatesMatchWorker(
  processor: (job: Job<MatesJobData>) => Promise<void>,
): Worker<MatesJobData> {
  const worker = new Worker<MatesJobData>(QUEUE_NAMES.MATES_MATCH, processor, {
    connection,
    concurrency: 1,
  })
  logger.info('Mates match worker started')
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, profileId: job.data.profileId }, 'Mates match job completed')
  })
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Mates match job failed')
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
  await Promise.all([
    syncQueue?.close(),
    embedQueue?.close(),
    weaveQueue?.close(),
    matesCrawlQueue?.close(),
    matesProfileQueue?.close(),
    matesEmbedQueue?.close(),
    matesMatchQueue?.close(),
  ])
  logger.info('All queues closed')
}
