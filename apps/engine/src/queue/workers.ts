import type { Job, Worker } from 'bullmq'
import { db, SyncJobStatus, ChunkJobStatus } from '@symploke/db'
import { logger } from '@symploke/logger'
import { syncRepo, failJob } from '../sync/repo-sync.js'
import { embedRepo, failChunkJob } from '../embed/embed-sync.js'
import { findWeaves } from '../weave/finder.js'
import { getPusherService } from '../pusher/service.js'
import { processCrawl, processProfile, processEmbed, processMatch } from '../mates/pipeline.js'
import {
  createSyncWorker,
  createEmbedWorker,
  createWeaveWorker,
  createMatesCrawlWorker,
  createMatesProfileWorker,
  createMatesEmbedWorker,
  createMatesMatchWorker,
  addSyncJob,
  addMatesProfileJob,
  addMatesEmbedJob,
  addMatesMatchJob,
  type SyncJobData,
  type EmbedJobData,
  type WeaveJobData,
  type MatesJobData,
} from './redis.js'

let syncWorker: Worker<SyncJobData> | null = null
let embedWorker: Worker<EmbedJobData> | null = null
let weaveWorker: Worker<WeaveJobData> | null = null
let matesCrawlWorker: Worker<MatesJobData> | null = null
let matesProfileWorker: Worker<MatesJobData> | null = null
let matesEmbedWorker: Worker<MatesJobData> | null = null
let matesMatchWorker: Worker<MatesJobData> | null = null

/**
 * Process a sync job from the BullMQ queue
 */
async function processSyncJob(job: Job<SyncJobData>): Promise<void> {
  const { repoId, triggeredBy } = job.data
  const pusher = getPusherService()

  // Special case: hourly sync trigger for all repos
  if (repoId === 'ALL' && triggeredBy === 'hourly') {
    await runHourlySyncForAllRepos()
    return
  }

  logger.info({ jobId: job.id, repoId, triggeredBy }, 'Processing sync job from Redis queue')

  // Create or get the database sync job record
  let dbJob = await db.repoSyncJob.findFirst({
    where: {
      repoId,
      status: SyncJobStatus.PENDING,
    },
    orderBy: { createdAt: 'desc' },
  })

  // If no pending job exists, create one
  if (!dbJob) {
    dbJob = await db.repoSyncJob.create({
      data: { repoId },
    })
  }

  try {
    await syncRepo(dbJob, pusher)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error({ error, jobId: dbJob.id, repoId }, 'Sync job failed')
    await failJob(dbJob.id, message, pusher)
    throw error // Re-throw so BullMQ marks it as failed
  }
}

/**
 * Process an embed job from the BullMQ queue
 */
async function processEmbedJob(job: Job<EmbedJobData>): Promise<void> {
  const { repoId, triggeredBy } = job.data
  const pusher = getPusherService()

  logger.info({ jobId: job.id, repoId, triggeredBy }, 'Processing embed job from Redis queue')

  // Create or get the database chunk job record
  let dbJob = await db.chunkSyncJob.findFirst({
    where: {
      repoId,
      status: ChunkJobStatus.PENDING,
    },
    orderBy: { createdAt: 'desc' },
  })

  // If no pending job exists, create one
  if (!dbJob) {
    dbJob = await db.chunkSyncJob.create({
      data: { repoId },
    })
  }

  try {
    await embedRepo(dbJob, pusher)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error({ error, jobId: dbJob.id, repoId }, 'Embed job failed')
    await failChunkJob(dbJob.id, message, pusher)
    throw error
  }
}

/**
 * Process a weave discovery job from the BullMQ queue
 */
async function processWeaveJob(job: Job<WeaveJobData>): Promise<void> {
  const { plexusId, triggeredBy } = job.data
  const pusher = getPusherService()

  logger.info({ jobId: job.id, plexusId, triggeredBy }, 'Processing weave job from Redis queue')

  try {
    const result = await findWeaves(plexusId, { verbose: true, pusher })
    logger.info(
      {
        plexusId,
        runId: result.runId,
        saved: result.saved,
        duration: `${(result.duration / 1000).toFixed(1)}s`,
      },
      'Weave discovery completed',
    )
  } catch (error) {
    logger.error({ error, plexusId }, 'Weave discovery failed')
    throw error
  }
}

// === Mates Pipeline Workers ===

async function processMatesCrawlJob(job: Job<MatesJobData>): Promise<void> {
  const { profileId, username } = job.data
  const pusher = getPusherService()
  logger.info({ jobId: job.id, profileId, username }, 'Processing mates crawl job')

  try {
    await processCrawl(profileId, { pusher })
    // Chain to next stage
    await addMatesProfileJob(profileId, username)
  } catch (error) {
    logger.error({ error, profileId, username }, 'Mates crawl job failed')
    throw error
  }
}

async function processMatesProfileJob(job: Job<MatesJobData>): Promise<void> {
  const { profileId, username } = job.data
  const pusher = getPusherService()
  logger.info({ jobId: job.id, profileId, username }, 'Processing mates profile job')

  try {
    await processProfile(profileId, { pusher })
    // Chain to next stage
    await addMatesEmbedJob(profileId, username)
  } catch (error) {
    logger.error({ error, profileId, username }, 'Mates profile job failed')
    throw error
  }
}

async function processMatesEmbedJob(job: Job<MatesJobData>): Promise<void> {
  const { profileId, username } = job.data
  const pusher = getPusherService()
  logger.info({ jobId: job.id, profileId, username }, 'Processing mates embed job')

  try {
    await processEmbed(profileId, { pusher })
    // Chain to next stage
    await addMatesMatchJob(profileId, username)
  } catch (error) {
    logger.error({ error, profileId, username }, 'Mates embed job failed')
    throw error
  }
}

async function processMatesMatchJob(job: Job<MatesJobData>): Promise<void> {
  const { profileId, username } = job.data
  const pusher = getPusherService()
  logger.info({ jobId: job.id, profileId, username }, 'Processing mates match job')

  try {
    await processMatch(profileId, { pusher })
  } catch (error) {
    logger.error({ error, profileId, username }, 'Mates match job failed')
    throw error
  }
}

/**
 * Run hourly sync for all repos across all plexuses
 */
async function runHourlySyncForAllRepos(): Promise<void> {
  logger.info('Running hourly sync for all plexuses...')

  const plexuses = await db.plexus.findMany({
    select: { id: true, name: true },
  })

  for (const plexus of plexuses) {
    try {
      const repos = await db.repo.findMany({
        where: { plexusId: plexus.id },
        select: { id: true, fullName: true },
      })

      if (repos.length === 0) continue

      // Check for repos that already have pending/in-progress sync jobs
      const existingJobs = await db.repoSyncJob.findMany({
        where: {
          repoId: { in: repos.map((r) => r.id) },
          status: {
            in: [
              SyncJobStatus.PENDING,
              SyncJobStatus.FETCHING_TREE,
              SyncJobStatus.PROCESSING_FILES,
            ],
          },
        },
        select: { repoId: true },
      })

      const reposWithExistingJobs = new Set(existingJobs.map((j) => j.repoId))
      const reposToSync = repos.filter((r) => !reposWithExistingJobs.has(r.id))

      if (reposToSync.length === 0) {
        logger.info({ plexus: plexus.name }, 'All repos already have sync jobs queued, skipping')
        continue
      }

      // Add sync jobs to Redis queue for each repo
      for (const repo of reposToSync) {
        await addSyncJob(repo.id, 'hourly')
      }

      logger.info(
        {
          plexus: plexus.name,
          reposQueued: reposToSync.length,
          reposSkipped: reposWithExistingJobs.size,
        },
        'Queued hourly sync jobs to Redis',
      )
    } catch (error) {
      logger.error({ error, plexus: plexus.name }, 'Error processing plexus in hourly sync')
      // Continue with other plexuses
    }
  }

  logger.info('Hourly sync scheduling complete')
}

/**
 * Start all BullMQ workers
 */
export async function startWorkers(): Promise<void> {
  logger.info('Starting BullMQ workers...')

  syncWorker = createSyncWorker(processSyncJob)
  embedWorker = createEmbedWorker(processEmbedJob)
  weaveWorker = createWeaveWorker(processWeaveJob)

  // Mates pipeline workers
  matesCrawlWorker = createMatesCrawlWorker(processMatesCrawlJob)
  matesProfileWorker = createMatesProfileWorker(processMatesProfileJob)
  matesEmbedWorker = createMatesEmbedWorker(processMatesEmbedJob)
  matesMatchWorker = createMatesMatchWorker(processMatesMatchJob)

  logger.info('All BullMQ workers started')
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers(): Promise<void> {
  logger.info('Stopping BullMQ workers...')

  await Promise.all([
    syncWorker?.close(),
    embedWorker?.close(),
    weaveWorker?.close(),
    matesCrawlWorker?.close(),
    matesProfileWorker?.close(),
    matesEmbedWorker?.close(),
    matesMatchWorker?.close(),
  ])

  syncWorker = null
  embedWorker = null
  weaveWorker = null
  matesCrawlWorker = null
  matesProfileWorker = null
  matesEmbedWorker = null
  matesMatchWorker = null

  logger.info('All BullMQ workers stopped')
}

/**
 * Get worker status
 */
export function getWorkerStatus(): {
  sync: boolean
  embed: boolean
  weave: boolean
  matesCrawl: boolean
  matesProfile: boolean
  matesEmbed: boolean
  matesMatch: boolean
} {
  return {
    sync: syncWorker?.isRunning() ?? false,
    embed: embedWorker?.isRunning() ?? false,
    weave: weaveWorker?.isRunning() ?? false,
    matesCrawl: matesCrawlWorker?.isRunning() ?? false,
    matesProfile: matesProfileWorker?.isRunning() ?? false,
    matesEmbed: matesEmbedWorker?.isRunning() ?? false,
    matesMatch: matesMatchWorker?.isRunning() ?? false,
  }
}
