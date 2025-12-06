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
