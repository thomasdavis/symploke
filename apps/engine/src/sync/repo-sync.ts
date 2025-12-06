import { db, type RepoSyncJob, type Repo, SyncJobStatus, FileJobStatus } from '@symploke/db'
import { logger } from '@symploke/logger'
import { getInstallationOctokit } from '../github/client.js'
import { fetchRepoTree, getDefaultBranch } from './tree-fetcher.js'
import { syncFile, deleteRemovedFiles } from './file-sync.js'
import { checkFile } from '../utils/file-utils.js'
import type { PusherService } from '../pusher/service.js'
import { notifySyncCompleted } from '../discord/service.js'

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

  // Fetch repo tree
  emitLog('info', 'Fetching repository file tree...')
  let tree: Awaited<ReturnType<typeof fetchRepoTree>>
  try {
    tree = await fetchRepoTree(octokit, repo.fullName, branch, installationId)
  } catch (error) {
    // Check if this is an empty repo (no branches)
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('Branch not found') || errorMessage.includes('Not Found')) {
      emitLog('warn', 'Repository appears to be empty (no branches/commits)')
      // Mark job as completed with 0 files
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

  // Apply maxFiles limit if specified
  let entries = tree.entries
  if (config.maxFiles && entries.length > config.maxFiles) {
    logger.info({ total: entries.length, limit: config.maxFiles }, 'Limiting files to process')
    emitLog('info', `Limiting to ${config.maxFiles} files (${entries.length} total)`)
    entries = entries.slice(0, config.maxFiles)
  }

  // Create file sync jobs
  emitLog('info', `Creating ${entries.length} file sync jobs...`)
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

  // Delete files that no longer exist in the repo (incremental sync)
  emitLog('info', 'Cleaning up removed files...')
  const currentPaths = new Set(entries.map((e) => e.path))
  await deleteRemovedFiles(repo.id, currentPaths)

  // Update repo lastIndexed
  await db.repo.update({
    where: { id: repo.id },
    data: {
      lastIndexed: new Date(),
      lastCommitSha: tree.treeSha,
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
