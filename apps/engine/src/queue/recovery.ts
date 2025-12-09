import { db, SyncJobStatus, ChunkJobStatus } from '@symploke/db'
import { logger } from '@symploke/logger'

/**
 * Recover stuck jobs on startup
 *
 * This runs when the engine starts to handle jobs that were interrupted
 * by a deployment/restart. It resets them to PENDING so they'll be picked up
 * by the queue processor.
 */
export async function recoverStuckJobs(): Promise<{
  syncJobsRecovered: number
  chunkJobsRecovered: number
}> {
  logger.info('Checking for stuck jobs to recover...')

  // Find sync jobs that were in progress when the service restarted
  const stuckSyncJobs = await db.repoSyncJob.findMany({
    where: {
      status: {
        in: [SyncJobStatus.FETCHING_TREE, SyncJobStatus.PROCESSING_FILES],
      },
    },
    include: { repo: { select: { fullName: true } } },
  })

  if (stuckSyncJobs.length > 0) {
    logger.info(
      { count: stuckSyncJobs.length, jobs: stuckSyncJobs.map((j) => j.repo.fullName) },
      'Found stuck sync jobs, resetting to PENDING',
    )

    // Reset to PENDING and clear progress counters since we'll restart from scratch
    await db.repoSyncJob.updateMany({
      where: {
        id: { in: stuckSyncJobs.map((j) => j.id) },
      },
      data: {
        status: SyncJobStatus.PENDING,
        processedFiles: 0,
        skippedFiles: 0,
        failedFiles: 0,
        startedAt: null,
        error: 'Recovered after service restart',
      },
    })
  }

  // Find chunk/embed jobs that were in progress
  const stuckChunkJobs = await db.chunkSyncJob.findMany({
    where: {
      status: {
        in: [ChunkJobStatus.CHUNKING, ChunkJobStatus.EMBEDDING],
      },
    },
    include: { repo: { select: { fullName: true } } },
  })

  if (stuckChunkJobs.length > 0) {
    logger.info(
      { count: stuckChunkJobs.length, jobs: stuckChunkJobs.map((j) => j.repo.fullName) },
      'Found stuck chunk jobs, resetting to PENDING',
    )

    // Reset to PENDING and clear progress counters since we'll restart from scratch
    await db.chunkSyncJob.updateMany({
      where: {
        id: { in: stuckChunkJobs.map((j) => j.id) },
      },
      data: {
        status: ChunkJobStatus.PENDING,
        processedFiles: 0,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        failedFiles: 0,
        startedAt: null,
        error: 'Recovered after service restart',
      },
    })
  }

  const result = {
    syncJobsRecovered: stuckSyncJobs.length,
    chunkJobsRecovered: stuckChunkJobs.length,
  }

  if (result.syncJobsRecovered > 0 || result.chunkJobsRecovered > 0) {
    logger.info(result, 'Job recovery complete')
  } else {
    logger.info('No stuck jobs found')
  }

  return result
}

/**
 * Re-queue orphaned PENDING jobs that exist in DB but not in Redis queue
 *
 * This handles the case where:
 * 1. Jobs were created (added to DB as PENDING and to Redis queue)
 * 2. Redis was restarted/cleared (queue jobs lost)
 * 3. DB still has PENDING jobs that will never be processed
 *
 * Should be called on startup and periodically to ensure resilience.
 */
export async function requeueOrphanedJobs(): Promise<{
  syncJobsRequeued: number
  chunkJobsRequeued: number
}> {
  // Dynamic import to avoid circular dependency
  const { addSyncJob, getSyncQueue } = await import('./redis.js')

  logger.info('Checking for orphaned PENDING jobs to re-queue...')

  // Find all PENDING sync jobs in the database
  const pendingSyncJobs = await db.repoSyncJob.findMany({
    where: {
      status: SyncJobStatus.PENDING,
    },
    include: { repo: { select: { id: true, fullName: true } } },
  })

  let syncJobsRequeued = 0

  if (pendingSyncJobs.length > 0) {
    const syncQueue = getSyncQueue()

    for (const job of pendingSyncJobs) {
      // Check if this job exists in the Redis queue
      const existingJob = await syncQueue.getJob(`sync-${job.repoId}`)

      if (!existingJob) {
        // Job is orphaned - exists in DB but not in queue
        logger.info(
          { repoId: job.repoId, repoName: job.repo.fullName, jobId: job.id },
          'Re-queuing orphaned sync job',
        )
        await addSyncJob(job.repoId, 'manual')
        syncJobsRequeued++
      }
    }
  }

  // TODO: Add similar logic for chunk jobs if needed
  const chunkJobsRequeued = 0

  const result = { syncJobsRequeued, chunkJobsRequeued }

  if (syncJobsRequeued > 0 || chunkJobsRequeued > 0) {
    logger.info(result, 'Orphaned jobs re-queued')
  } else if (pendingSyncJobs.length > 0) {
    logger.info({ pendingInDb: pendingSyncJobs.length }, 'All PENDING jobs already in queue')
  } else {
    logger.info('No orphaned jobs found')
  }

  return result
}

/**
 * Cancel old PENDING jobs that have been waiting too long
 *
 * Jobs that have been PENDING for more than the threshold are likely
 * from failed queue operations and should be cancelled.
 */
export async function cancelStaleJobs(maxAgeMinutes: number = 60): Promise<{
  syncJobsCancelled: number
}> {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000)

  const staleSyncJobs = await db.repoSyncJob.findMany({
    where: {
      status: SyncJobStatus.PENDING,
      createdAt: { lt: cutoff },
    },
    include: { repo: { select: { fullName: true } } },
  })

  if (staleSyncJobs.length > 0) {
    logger.warn(
      {
        count: staleSyncJobs.length,
        maxAgeMinutes,
        jobs: staleSyncJobs.map((j) => j.repo.fullName),
      },
      'Cancelling stale PENDING jobs',
    )

    await db.repoSyncJob.updateMany({
      where: {
        id: { in: staleSyncJobs.map((j) => j.id) },
      },
      data: {
        status: SyncJobStatus.CANCELLED,
        error: `Cancelled: pending for more than ${maxAgeMinutes} minutes`,
        completedAt: new Date(),
      },
    })
  }

  return { syncJobsCancelled: staleSyncJobs.length }
}
