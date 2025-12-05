import { db, SyncJobStatus } from '@symploke/db'
import { logger } from '@symploke/logger'
import { config } from '../config.js'
import { syncRepo, failJob } from '../sync/repo-sync.js'
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
    // Find next pending job (oldest first)
    const job = await db.repoSyncJob.findFirst({
      where: {
        status: SyncJobStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (!job) {
      return // No jobs to process
    }

    this.currentJobId = job.id
    logger.info({ jobId: job.id, repoId: job.repoId }, 'Processing sync job')

    const pusher = getPusherService()

    try {
      await syncRepo(job, pusher)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error({ error, jobId: job.id }, 'Sync job failed')
      await failJob(job.id, message, pusher)
    } finally {
      this.currentJobId = null
    }
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
      config: config || null,
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
