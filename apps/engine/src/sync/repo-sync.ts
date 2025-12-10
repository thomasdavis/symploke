import {
  db,
  type RepoSyncJob,
  type Repo,
  SyncJobStatus,
  FileJobStatus,
  ChunkJobStatus,
} from '@symploke/db'
import { logger } from '@symploke/logger'
import { getInstallationOctokit } from '../github/client.js'
import {
  fetchRepoTree,
  getDefaultBranch,
  compareCommits,
  type CompareResult,
} from './tree-fetcher.js'
import { syncFile, deleteRemovedFiles } from './file-sync.js'
import { checkFile } from '../utils/file-utils.js'
import type { PusherService } from '../pusher/service.js'
import { notifySyncCompleted } from '../discord/service.js'
import { createChunkJob } from '../queue/processor.js'

export interface SyncConfig {
  maxFiles?: number
  maxContentFiles?: number
  skipContent?: boolean
}

/**
 * Find the installation ID that has access to this repo
 */
async function findInstallationForRepo(repo: Repo): Promise<number | null> {
  // Extract owner from fullName (e.g., "owner/repo" -> "owner")
  const owner = repo.fullName.split('/')[0]
  if (!owner) return null

  // Find a plexus member who has an installation for this owner
  const plexusMembers = await db.plexusMember.findMany({
    where: { plexusId: repo.plexusId },
    select: { userId: true },
  })

  for (const member of plexusMembers) {
    const installation = await db.gitHubAppInstallation.findFirst({
      where: {
        userId: member.userId,
        accountLogin: {
          equals: owner,
          mode: 'insensitive',
        },
        suspended: false,
      },
    })

    if (installation) {
      return installation.installationId
    }
  }

  return null
}

/**
 * Main repo sync orchestration
 */
export async function syncRepo(job: RepoSyncJob, pusher?: PusherService): Promise<void> {
  const startTime = Date.now()
  const config: SyncConfig = (job.config as SyncConfig) || {}

  logger.info({ jobId: job.id, repoId: job.repoId, config }, 'Starting repo sync')

  // Get the repo
  const repo = await db.repo.findUnique({
    where: { id: job.repoId },
    include: { plexus: true },
  })

  if (!repo) {
    throw new Error(`Repo not found: ${job.repoId}`)
  }

  // Helper to emit logs
  const emitLog = (
    level: 'info' | 'warn' | 'error' | 'success',
    message: string,
    details?: string,
  ) => {
    pusher?.emitSyncLog(repo.plexusId, { repoId: repo.id, level, message, details })
  }

  emitLog('info', `Starting sync for ${repo.fullName}`)

  // Find installation for this repo
  emitLog('info', 'Finding GitHub App installation...')
  const installationId = await findInstallationForRepo(repo)
  if (!installationId) {
    emitLog('error', 'No GitHub App installation found')
    throw new Error(`No GitHub App installation found for repo: ${repo.fullName}`)
  }
  emitLog('info', `Found installation: ${installationId}`)

  // Get Octokit instance
  const octokit = await getInstallationOctokit(installationId)

  // Update job status to FETCHING_TREE
  await db.repoSyncJob.update({
    where: { id: job.id },
    data: {
      status: SyncJobStatus.FETCHING_TREE,
      startedAt: new Date(),
    },
  })

  pusher?.emitSyncProgress(repo.plexusId, {
    jobId: job.id,
    repoId: repo.id,
    status: SyncJobStatus.FETCHING_TREE,
    processedFiles: 0,
    totalFiles: 0,
    skippedFiles: 0,
    failedFiles: 0,
  })

  // Always fetch default branch fresh from GitHub (it may have changed)
  emitLog('info', 'Fetching default branch...')
  let branch: string
  try {
    branch = await getDefaultBranch(octokit, repo.fullName, installationId)
    // Update in database if it changed
    if (branch !== repo.defaultBranch) {
      await db.repo.update({
        where: { id: repo.id },
        data: { defaultBranch: branch },
      })
    }
    emitLog('info', `Using branch: ${branch}`)
  } catch (error) {
    logger.warn({ error, repo: repo.fullName }, 'Could not fetch default branch')
    // Fall back to cached value or 'main'
    branch = repo.defaultBranch || 'main'
    emitLog('warn', `Could not detect default branch, using: ${branch}`)
  }

  // Try incremental sync first if we have a previous commit SHA
  let compareResult: CompareResult | null = null
  let isIncrementalSync = false
  let headCommitSha: string | null = null

  if (repo.lastCommitSha) {
    emitLog('info', `Checking for changes since last sync (${repo.lastCommitSha.slice(0, 7)})...`)
    compareResult = await compareCommits(
      octokit,
      repo.fullName,
      repo.lastCommitSha,
      branch,
      installationId,
    )

    if (compareResult) {
      headCommitSha = compareResult.headCommitSha

      // If no changes, complete immediately
      if (compareResult.totalChanges === 0) {
        emitLog('success', 'No changes detected since last sync')
        await db.repoSyncJob.update({
          where: { id: job.id },
          data: {
            status: SyncJobStatus.COMPLETED,
            totalFiles: 0,
            processedFiles: 0,
            skippedFiles: 0,
            completedAt: new Date(),
          },
        })
        pusher?.emitSyncCompleted(repo.plexusId, {
          jobId: job.id,
          repoId: repo.id,
          status: SyncJobStatus.COMPLETED,
          processedFiles: 0,
          totalFiles: 0,
          skippedFiles: 0,
          failedFiles: 0,
        })
        return
      }

      isIncrementalSync = true
      emitLog(
        'info',
        `Incremental sync: ${compareResult.added.length} added, ${compareResult.modified.length} modified, ${compareResult.removed.length} removed`,
      )
    }
  }

  // Fall back to full tree fetch if no previous commit or compare failed
  let entries: { path: string; sha: string; size: number }[]

  if (isIncrementalSync && compareResult) {
    // Use only changed files from compare result
    entries = [...compareResult.added, ...compareResult.modified]

    // Handle removed files immediately
    if (compareResult.removed.length > 0) {
      emitLog('info', `Removing ${compareResult.removed.length} deleted files...`)
      await db.file.deleteMany({
        where: {
          repoId: repo.id,
          path: { in: compareResult.removed },
        },
      })
      emitLog('success', `Removed ${compareResult.removed.length} deleted files`)
    }
  } else {
    // Full tree fetch
    emitLog('info', 'Fetching full repository file tree...')
    let tree: Awaited<ReturnType<typeof fetchRepoTree>>
    try {
      tree = await fetchRepoTree(octokit, repo.fullName, branch, installationId)
      headCommitSha = tree.commitSha
    } catch (error) {
      // Check if this is an empty repo (no branches)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Branch not found') || errorMessage.includes('Not Found')) {
        emitLog('warn', 'Repository appears to be empty (no branches/commits)')
        await db.repoSyncJob.update({
          where: { id: job.id },
          data: {
            status: SyncJobStatus.COMPLETED,
            totalFiles: 0,
            processedFiles: 0,
            completedAt: new Date(),
          },
        })
        pusher?.emitSyncCompleted(repo.plexusId, {
          jobId: job.id,
          repoId: repo.id,
          status: SyncJobStatus.COMPLETED,
          processedFiles: 0,
          totalFiles: 0,
          skippedFiles: 0,
          failedFiles: 0,
        })
        emitLog('success', 'Sync completed (empty repository)')
        return
      }
      throw error
    }
    emitLog('info', `Found ${tree.entries.length} files in repository`)
    entries = tree.entries
  }

  // Apply maxFiles limit if specified
  if (config.maxFiles && entries.length > config.maxFiles) {
    logger.info({ total: entries.length, limit: config.maxFiles }, 'Limiting files to process')
    emitLog('info', `Limiting to ${config.maxFiles} files (${entries.length} total)`)
    entries = entries.slice(0, config.maxFiles)
  }

  // If no entries to process after incremental sync
  if (entries.length === 0) {
    emitLog('success', 'No files to process')
    // Update lastCommitSha even if no files to process
    if (headCommitSha) {
      await db.repo.update({
        where: { id: repo.id },
        data: { lastCommitSha: headCommitSha, lastIndexed: new Date() },
      })
    }
    await db.repoSyncJob.update({
      where: { id: job.id },
      data: {
        status: SyncJobStatus.COMPLETED,
        totalFiles: 0,
        processedFiles: 0,
        skippedFiles: 0,
        completedAt: new Date(),
      },
    })
    pusher?.emitSyncCompleted(repo.plexusId, {
      jobId: job.id,
      repoId: repo.id,
      status: SyncJobStatus.COMPLETED,
      processedFiles: 0,
      totalFiles: 0,
      skippedFiles: 0,
      failedFiles: 0,
    })
    return
  }

  // Create file sync jobs
  const syncType = isIncrementalSync ? 'incremental' : 'full'
  emitLog('info', `Creating ${entries.length} file sync jobs (${syncType} sync)...`)

  // Clean up any existing file jobs from a previous partial run (e.g., after job recovery)
  const existingFileJobs = await db.fileSyncJob.count({ where: { syncJobId: job.id } })
  if (existingFileJobs > 0) {
    emitLog('info', `Cleaning up ${existingFileJobs} file jobs from previous run...`)
    await db.fileSyncJob.deleteMany({ where: { syncJobId: job.id } })
  }

  const fileJobs = entries.map((entry) => ({
    syncJobId: job.id,
    repoId: repo.id,
    path: entry.path,
    sha: entry.sha,
    size: entry.size,
    status: FileJobStatus.PENDING,
  }))

  // Batch insert file jobs
  await db.fileSyncJob.createMany({
    data: fileJobs,
  })
  emitLog('success', `Created ${fileJobs.length} file sync jobs`)

  // Update job with total files
  await db.repoSyncJob.update({
    where: { id: job.id },
    data: {
      status: SyncJobStatus.PROCESSING_FILES,
      totalFiles: entries.length,
    },
  })

  pusher?.emitSyncProgress(repo.plexusId, {
    jobId: job.id,
    repoId: repo.id,
    status: SyncJobStatus.PROCESSING_FILES,
    processedFiles: 0,
    totalFiles: entries.length,
    skippedFiles: 0,
    failedFiles: 0,
  })
  emitLog('info', `Starting to process ${entries.length} files...`)

  // Process file jobs
  let processedFiles = 0
  let skippedFiles = 0
  let failedFiles = 0
  let contentFileCount = 0

  // Get all file jobs for this sync
  const allFileJobs = await db.fileSyncJob.findMany({
    where: { syncJobId: job.id },
    orderBy: { createdAt: 'asc' },
  })

  for (const fileJob of allFileJobs) {
    try {
      // Check if we should skip content for this file
      const shouldSkipContent =
        config.skipContent ||
        (config.maxContentFiles !== undefined && contentFileCount >= config.maxContentFiles)

      // Check if we'd skip content anyway
      const fileCheck = checkFile(fileJob.path, fileJob.size)

      // Mark job as processing
      await db.fileSyncJob.update({
        where: { id: fileJob.id },
        data: { status: FileJobStatus.PROCESSING },
      })

      // Sync the file
      const result = await syncFile(
        octokit,
        fileJob,
        repo.fullName,
        installationId,
        shouldSkipContent,
      )

      // Track content file count
      if (!result.skipped && !fileCheck.shouldSkipContent) {
        contentFileCount++
      }

      // Update file job status
      if (result.success) {
        if (result.skipped) {
          skippedFiles++
          await db.fileSyncJob.update({
            where: { id: fileJob.id },
            data: {
              status: FileJobStatus.SKIPPED,
              skipReason: result.skipReason,
              processedAt: new Date(),
            },
          })
          // Log skipped files periodically to avoid noise
          if (skippedFiles <= 5 || skippedFiles % 50 === 0) {
            emitLog('info', `Skipped: ${fileJob.path}`, result.skipReason)
          }
        } else {
          await db.fileSyncJob.update({
            where: { id: fileJob.id },
            data: {
              status: FileJobStatus.COMPLETED,
              processedAt: new Date(),
            },
          })
        }
      } else {
        failedFiles++
        await db.fileSyncJob.update({
          where: { id: fileJob.id },
          data: {
            status: FileJobStatus.FAILED,
            error: result.error,
            processedAt: new Date(),
          },
        })
        emitLog('error', `Failed: ${fileJob.path}`, result.error)
      }

      processedFiles++

      // Update sync job progress periodically
      if (processedFiles % 10 === 0 || processedFiles === entries.length) {
        await db.repoSyncJob.update({
          where: { id: job.id },
          data: {
            processedFiles,
            skippedFiles,
            failedFiles,
          },
        })

        pusher?.emitSyncProgress(repo.plexusId, {
          jobId: job.id,
          repoId: repo.id,
          status: SyncJobStatus.PROCESSING_FILES,
          processedFiles,
          totalFiles: entries.length,
          skippedFiles,
          failedFiles,
          currentFile: fileJob.path,
        })

        // Log progress every 25 files or on milestones
        if (processedFiles % 25 === 0 || processedFiles === entries.length) {
          const pct = Math.round((processedFiles / entries.length) * 100)
          emitLog('info', `Progress: ${processedFiles}/${entries.length} files (${pct}%)`)
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error({ error, fileId: fileJob.id, path: fileJob.path }, 'Error processing file')
      failedFiles++
      processedFiles++

      await db.fileSyncJob.update({
        where: { id: fileJob.id },
        data: {
          status: FileJobStatus.FAILED,
          error: message,
          processedAt: new Date(),
        },
      })
      emitLog('error', `Exception processing: ${fileJob.path}`, message)
    }
  }

  // For full sync, delete files that no longer exist in the repo
  // (Incremental sync handles deletions via compareResult.removed above)
  if (!isIncrementalSync) {
    emitLog('info', 'Cleaning up removed files...')
    const currentPaths = new Set(entries.map((e) => e.path))
    await deleteRemovedFiles(repo.id, currentPaths)
  }

  // Update repo lastIndexed and lastCommitSha
  await db.repo.update({
    where: { id: repo.id },
    data: {
      lastIndexed: new Date(),
      lastCommitSha: headCommitSha,
    },
  })

  // Mark job as completed
  await db.repoSyncJob.update({
    where: { id: job.id },
    data: {
      status: SyncJobStatus.COMPLETED,
      processedFiles,
      skippedFiles,
      failedFiles,
      completedAt: new Date(),
    },
  })

  const duration = Date.now() - startTime
  const durationSec = (duration / 1000).toFixed(1)
  logger.info(
    {
      jobId: job.id,
      repoId: repo.id,
      processedFiles,
      skippedFiles,
      failedFiles,
      duration,
    },
    'Repo sync completed',
  )

  pusher?.emitSyncProgress(repo.plexusId, {
    jobId: job.id,
    repoId: repo.id,
    status: SyncJobStatus.COMPLETED,
    processedFiles,
    totalFiles: entries.length,
    skippedFiles,
    failedFiles,
  })

  // Final success log with summary
  emitLog(
    'success',
    `Sync completed in ${durationSec}s`,
    `${processedFiles} processed, ${skippedFiles} skipped, ${failedFiles} failed`,
  )

  // Send Discord notification
  await notifySyncCompleted({
    repoName: repo.name,
    repoFullName: repo.fullName,
    plexusName: repo.plexus.name,
    totalFiles: entries.length,
    processedFiles,
    skippedFiles,
    failedFiles,
    duration,
    jobId: job.id,
  })

  // Auto-trigger embedding if there are files that need it
  await triggerEmbeddingIfNeeded(repo.id, emitLog)
}

/**
 * Check if repo has files needing embedding and create a chunk job if so
 */
async function triggerEmbeddingIfNeeded(
  repoId: string,
  emitLog: (
    level: 'info' | 'warn' | 'error' | 'success',
    message: string,
    details?: string,
  ) => void,
): Promise<void> {
  try {
    // Check if there's already a pending/in-progress chunk job
    const existingChunkJob = await db.chunkSyncJob.findFirst({
      where: {
        repoId,
        status: {
          in: [ChunkJobStatus.PENDING, ChunkJobStatus.CHUNKING, ChunkJobStatus.EMBEDDING],
        },
      },
    })

    if (existingChunkJob) {
      emitLog('info', 'Embedding job already queued', `Job ID: ${existingChunkJob.id}`)
      return
    }

    // Count files that have content but either:
    // 1. Haven't been chunked yet (lastChunkedSha is null)
    // 2. Have been modified since last chunking (sha != lastChunkedSha)
    const filesNeedingChunkingResult = await db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM files
      WHERE "repoId" = ${repoId}
        AND content IS NOT NULL
        AND "skippedReason" IS NULL
        AND ("lastChunkedSha" IS NULL OR "lastChunkedSha" != sha)
    `
    const filesNeedingChunking = Number(filesNeedingChunkingResult[0]?.count ?? 0)

    // Also check for chunks without embeddings
    const chunksNeedingEmbedding = await db.chunk.count({
      where: {
        file: { repoId },
        embeddedAt: null,
      },
    })

    if (filesNeedingChunking > 0 || chunksNeedingEmbedding > 0) {
      emitLog(
        'info',
        'Auto-triggering embedding job',
        `${filesNeedingChunking} files need chunking, ${chunksNeedingEmbedding} chunks need embedding`,
      )

      const chunkJobId = await createChunkJob(repoId)
      logger.info(
        { repoId, chunkJobId, filesNeedingChunking, chunksNeedingEmbedding },
        'Auto-created chunk job after sync',
      )
      emitLog('success', 'Embedding job queued', `Job ID: ${chunkJobId}`)
    } else {
      emitLog('info', 'All files already have embeddings')
    }
  } catch (error) {
    logger.error({ error, repoId }, 'Error checking/triggering embedding after sync')
    emitLog(
      'warn',
      'Could not auto-trigger embedding',
      error instanceof Error ? error.message : String(error),
    )
  }
}

/**
 * Mark a job as failed
 */
export async function failJob(jobId: string, error: string, pusher?: PusherService): Promise<void> {
  const job = await db.repoSyncJob.update({
    where: { id: jobId },
    data: {
      status: SyncJobStatus.FAILED,
      error,
      completedAt: new Date(),
    },
    include: { repo: true },
  })

  pusher?.emitSyncProgress(job.repo.plexusId, {
    jobId: job.id,
    repoId: job.repoId,
    status: SyncJobStatus.FAILED,
    processedFiles: job.processedFiles,
    totalFiles: job.totalFiles || 0,
    skippedFiles: job.skippedFiles,
    failedFiles: job.failedFiles,
    error,
  })

  // Emit error log
  pusher?.emitSyncLog(job.repo.plexusId, {
    repoId: job.repoId,
    level: 'error',
    message: 'Sync failed',
    details: error,
  })
}
