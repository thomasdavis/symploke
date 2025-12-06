import { db, SyncJobStatus, ChunkJobStatus } from '@symploke/db'
import { logger } from '@symploke/logger'
import { config } from '../config.js'
import { syncRepo, failJob } from '../sync/repo-sync.js'
import { embedRepo, failChunkJob } from '../embed/embed-sync.js'
import { getPusherService } from '../pusher/service.js'

/**
 * Queue processor that polls PostgreSQL for pending sync jobs
 */
export class QueueProcessor {
  private running = false
  private currentJobId: string | null = null
  private pollInterval: NodeJS.Timeout | null = null

  /**
   * Start processing jobs
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('Queue processor already running')
      return
    }

    this.running = true
    logger.info('Queue processor started')

    // Process jobs in a loop
    this.poll()
  }

  /**
   * Stop processing jobs
   */
  async stop(): Promise<void> {
    logger.info('Stopping queue processor...')
    this.running = false

    if (this.pollInterval) {
      clearTimeout(this.pollInterval)
      this.pollInterval = null
    }

    // Wait for current job to finish if any
    if (this.currentJobId) {
      logger.info({ jobId: this.currentJobId }, 'Waiting for current job to complete')
      // We'll let it finish naturally
    }
  }

  /**
   * Poll for and process jobs
   */
  private async poll(): Promise<void> {
    if (!this.running) return

    try {
      await this.processNextJob()
    } catch (error) {
      logger.error({ error }, 'Error in poll loop')
    }

    // Schedule next poll
    this.pollInterval = setTimeout(() => this.poll(), config.QUEUE_POLL_INTERVAL_MS)
  }

  /**
   * Process the next pending job
   */
  private async processNextJob(): Promise<void> {
    const pusher = getPusherService()

    // Check for pending sync jobs first
    const syncJob = await db.repoSyncJob.findFirst({
      where: {
        status: SyncJobStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (syncJob) {
      this.currentJobId = syncJob.id
      logger.info({ jobId: syncJob.id, repoId: syncJob.repoId }, 'Processing sync job')

      try {
        await syncRepo(syncJob, pusher)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error({ error, jobId: syncJob.id }, 'Sync job failed')
        await failJob(syncJob.id, message, pusher)
      } finally {
        this.currentJobId = null
      }
      return
    }

    // Check for pending chunk/embed jobs
    const chunkJob = await db.chunkSyncJob.findFirst({
      where: {
        status: ChunkJobStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (chunkJob) {
      this.currentJobId = chunkJob.id
      logger.info({ jobId: chunkJob.id, repoId: chunkJob.repoId }, 'Processing chunk job')

      try {
        await embedRepo(chunkJob, pusher)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error({ error, jobId: chunkJob.id }, 'Chunk job failed')
        await failChunkJob(chunkJob.id, message, pusher)
      } finally {
        this.currentJobId = null
      }
      return
    }

    // No jobs to process
  }

  /**
   * Get current status
   */
  getStatus(): { running: boolean; currentJobId: string | null } {
    return {
      running: this.running,
      currentJobId: this.currentJobId,
    }
  }
}

// Singleton instance
let processorInstance: QueueProcessor | null = null

export function getQueueProcessor(): QueueProcessor {
  if (!processorInstance) {
    processorInstance = new QueueProcessor()
  }
  return processorInstance
}

/**
 * Create a new sync job for a repository
 */
export async function createSyncJob(
  repoId: string,
  config?: {
    maxFiles?: number
    maxContentFiles?: number
    skipContent?: boolean
  },
): Promise<string> {
  // Check if there's already a pending or in-progress job for this repo
  const existingJob = await db.repoSyncJob.findFirst({
    where: {
      repoId,
      status: {
        in: [SyncJobStatus.PENDING, SyncJobStatus.FETCHING_TREE, SyncJobStatus.PROCESSING_FILES],
      },
    },
  })

  if (existingJob) {
    logger.warn({ repoId, existingJobId: existingJob.id }, 'Sync job already exists for repo')
    return existingJob.id
  }

  // Create new job
  const job = await db.repoSyncJob.create({
    data: {
      repoId,
      config: config ?? undefined,
    },
  })

  logger.info({ jobId: job.id, repoId }, 'Created sync job')
  return job.id
}

/**
 * Get sync job status
 */
export async function getJobStatus(jobId: string) {
  return db.repoSyncJob.findUnique({
    where: { id: jobId },
    include: {
      repo: {
        select: { name: true, fullName: true },
      },
      _count: {
        select: { fileJobs: true },
      },
    },
  })
}

/**
 * List jobs with optional filtering
 */
export async function listJobs(options?: {
  status?: SyncJobStatus
  repoId?: string
  limit?: number
}) {
  return db.repoSyncJob.findMany({
    where: {
      ...(options?.status && { status: options.status }),
      ...(options?.repoId && { repoId: options.repoId }),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 20,
    include: {
      repo: {
        select: { name: true, fullName: true },
      },
    },
  })
}

/**
 * Create a new chunk/embed job for a repository
 */
export async function createChunkJob(
  repoId: string,
  config?: {
    chunkSize?: number
    overlap?: number
  },
): Promise<string> {
  // Check if there's already a pending or in-progress chunk job for this repo
  const existingJob = await db.chunkSyncJob.findFirst({
    where: {
      repoId,
      status: {
        in: [ChunkJobStatus.PENDING, ChunkJobStatus.CHUNKING, ChunkJobStatus.EMBEDDING],
      },
    },
  })

  if (existingJob) {
    logger.warn({ repoId, existingJobId: existingJob.id }, 'Chunk job already exists for repo')
    return existingJob.id
  }

  // Create new job
  const job = await db.chunkSyncJob.create({
    data: {
      repoId,
      config: config ?? undefined,
    },
  })

  logger.info({ jobId: job.id, repoId }, 'Created chunk job')
  return job.id
}

/**
 * Get chunk job status
 */
export async function getChunkJobStatus(jobId: string) {
  return db.chunkSyncJob.findUnique({
    where: { id: jobId },
    include: {
      repo: {
        select: { name: true, fullName: true },
      },
    },
  })
}

/**
 * List chunk jobs with optional filtering
 */
export async function listChunkJobs(options?: {
  status?: ChunkJobStatus
  repoId?: string
  limit?: number
}) {
  return db.chunkSyncJob.findMany({
    where: {
      ...(options?.status && { status: options.status }),
      ...(options?.repoId && { repoId: options.repoId }),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 20,
    include: {
      repo: {
        select: { name: true, fullName: true },
      },
    },
  })
}
