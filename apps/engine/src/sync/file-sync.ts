import type { Octokit } from '@octokit/rest'
import { db, type FileSyncJob } from '@symploke/db'
import { logger } from '@symploke/logger'
import { rateLimiter } from '../github/rate-limiter.js'
import { parseRepoFullName } from '../github/client.js'
import { checkFile, detectLanguage, countLines } from '../utils/file-utils.js'

export interface FileSyncResult {
  success: boolean
  skipped: boolean
  skipReason?: string
  error?: string
}

/**
 * Sync a single file from GitHub to the database
 */
export async function syncFile(
  octokit: Octokit,
  job: FileSyncJob,
  repoFullName: string,
  installationId: number,
  skipContentOverride?: boolean,
): Promise<FileSyncResult> {
  const { owner, repo } = parseRepoFullName(repoFullName)

  // Check if file already exists with same SHA (no need to fetch again)
  const existingFile = await db.file.findUnique({
    where: {
      repoId_path: {
        repoId: job.repoId,
        path: job.path,
      },
    },
    select: { sha: true },
  })

  if (existingFile?.sha === job.sha) {
    logger.debug({ path: job.path, sha: job.sha }, 'File unchanged, skipping fetch')
    return {
      success: true,
      skipped: true,
      skipReason: 'unchanged',
    }
  }

  // Check if content should be skipped
  const fileCheck = checkFile(job.path, job.size)
  const shouldSkipContent = skipContentOverride || fileCheck.shouldSkipContent

  let content: string | null = null
  let encoding: string | null = null

  // Fetch content if not skipping
  if (!shouldSkipContent) {
    try {
      // Check rate limit
      if (!(await rateLimiter.canProceed(installationId))) {
        await rateLimiter.waitForReset(installationId)
      }

      const { data, headers } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path: job.path,
      })

      // Record rate limit
      const rateLimit = rateLimiter.extractFromHeaders(headers as Record<string, string>)
      if (rateLimit) {
        await rateLimiter.recordRateLimit(
          installationId,
          rateLimit.remaining,
          rateLimit.limit,
          rateLimit.reset,
        )
      }

      // Handle file content
      if ('content' in data && typeof data.content === 'string') {
        encoding = data.encoding || 'base64'
        if (encoding === 'base64') {
          content = Buffer.from(data.content, 'base64').toString('utf-8')
        } else {
          content = data.content
        }
      }
    } catch (error: unknown) {
      // Handle specific errors
      const err = error as { status?: number; message?: string }
      if (err.status === 404) {
        logger.warn({ path: job.path, repo: repoFullName }, 'File not found')
        return { success: false, skipped: true, skipReason: 'not_found' }
      }
      if (err.status === 403 && err.message?.includes('too large')) {
        logger.warn({ path: job.path, repo: repoFullName }, 'File too large for API')
        // Still save metadata, just skip content
        fileCheck.shouldSkipContent = true
        fileCheck.skipReason = 'too_large'
      } else {
        logger.error({ error, path: job.path, repo: repoFullName }, 'Error fetching file content')
        throw error
      }
    }
  }

  // Detect language and count lines
  const language = detectLanguage(job.path)
  const loc = content ? countLines(content) : null

  // Upsert file record
  try {
    await db.file.upsert({
      where: {
        repoId_path: {
          repoId: job.repoId,
          path: job.path,
        },
      },
      create: {
        repoId: job.repoId,
        path: job.path,
        content,
        sha: job.sha,
        size: job.size,
        encoding: shouldSkipContent ? null : 'utf-8',
        skippedReason: fileCheck.skipReason || null,
        language,
        loc,
      },
      update: {
        content,
        sha: job.sha,
        size: job.size,
        encoding: shouldSkipContent ? null : 'utf-8',
        skippedReason: fileCheck.skipReason || null,
        language,
        loc,
      },
    })

    logger.debug({ path: job.path, skipped: shouldSkipContent, size: job.size }, 'File synced')

    return {
      success: true,
      skipped: shouldSkipContent,
      skipReason: fileCheck.skipReason,
    }
  } catch (error: unknown) {
    logger.error({ error, path: job.path }, 'Error upserting file')
    return {
      success: false,
      skipped: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Delete files that no longer exist in the repo
 */
export async function deleteRemovedFiles(
  repoId: string,
  currentPaths: Set<string>,
): Promise<number> {
  // Get all existing file paths for this repo
  const existingFiles = await db.file.findMany({
    where: { repoId },
    select: { id: true, path: true },
  })

  // Find files to delete
  const toDelete = existingFiles.filter(
    (f: { id: string; path: string }) => !currentPaths.has(f.path),
  )

  if (toDelete.length === 0) {
    return 0
  }

  // Delete removed files
  await db.file.deleteMany({
    where: {
      id: { in: toDelete.map((f: { id: string; path: string }) => f.id) },
    },
  })

  logger.info({ count: toDelete.length, repoId }, 'Deleted removed files')
  return toDelete.length
}
