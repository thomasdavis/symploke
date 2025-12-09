import type { Octokit } from '@octokit/rest'
import { logger } from '@symploke/logger'
import { rateLimiter } from '../github/rate-limiter.js'
import { parseRepoFullName } from '../github/client.js'
import { shouldIgnorePath } from '../utils/file-utils.js'

export interface TreeEntry {
  path: string
  sha: string
  size: number
  type: 'blob' | 'tree'
}

export interface FetchTreeResult {
  entries: TreeEntry[]
  truncated: boolean
  treeSha: string
  commitSha: string
}

export interface CompareResult {
  added: TreeEntry[]
  modified: TreeEntry[]
  removed: string[] // just paths for removed files
  headCommitSha: string
  baseCommitSha: string
  totalChanges: number
}

/**
 * Fetch the file tree for a repository using Git Trees API
 * This is efficient as it returns all files in a single request
 */
export async function fetchRepoTree(
  octokit: Octokit,
  fullName: string,
  branch: string,
  installationId: number,
): Promise<FetchTreeResult> {
  const { owner, repo } = parseRepoFullName(fullName)

  // First, get the branch to find the tree SHA
  logger.debug({ owner, repo, branch }, 'Fetching branch reference')

  // Check rate limit before making request
  if (!(await rateLimiter.canProceed(installationId))) {
    await rateLimiter.waitForReset(installationId)
  }

  const { data: branchData, headers: branchHeaders } = await octokit.request(
    'GET /repos/{owner}/{repo}/branches/{branch}',
    { owner, repo, branch },
  )

  // Record rate limit from response
  const branchRateLimit = rateLimiter.extractFromHeaders(branchHeaders as Record<string, string>)
  if (branchRateLimit) {
    await rateLimiter.recordRateLimit(
      installationId,
      branchRateLimit.remaining,
      branchRateLimit.limit,
      branchRateLimit.reset,
    )
  }

  const treeSha = branchData.commit.commit.tree.sha
  const commitSha = branchData.commit.sha

  // Now fetch the full tree recursively
  logger.debug({ owner, repo, treeSha }, 'Fetching tree recursively')

  if (!(await rateLimiter.canProceed(installationId))) {
    await rateLimiter.waitForReset(installationId)
  }

  const { data: treeData, headers: treeHeaders } = await octokit.request(
    'GET /repos/{owner}/{repo}/git/trees/{tree_sha}',
    {
      owner,
      repo,
      tree_sha: treeSha,
      recursive: '1',
    },
  )

  // Record rate limit from response
  const treeRateLimit = rateLimiter.extractFromHeaders(treeHeaders as Record<string, string>)
  if (treeRateLimit) {
    await rateLimiter.recordRateLimit(
      installationId,
      treeRateLimit.remaining,
      treeRateLimit.limit,
      treeRateLimit.reset,
    )
  }

  // Filter to only blob (file) entries and ignore certain directories
  const entries: TreeEntry[] = treeData.tree
    .filter((item): item is typeof item & { size: number } => {
      // Only include blobs (files) with size
      if (item.type !== 'blob' || item.size === undefined) {
        return false
      }
      // Skip ignored directories
      if (shouldIgnorePath(item.path || '')) {
        return false
      }
      return true
    })
    .map((item) => ({
      path: item.path!,
      sha: item.sha!,
      size: item.size,
      type: 'blob' as const,
    }))

  logger.info(
    { owner, repo, totalFiles: entries.length, truncated: treeData.truncated },
    'Fetched repository tree',
  )

  return {
    entries,
    truncated: treeData.truncated ?? false,
    treeSha,
    commitSha,
  }
}

/**
 * Get the default branch for a repository
 */
export async function getDefaultBranch(
  octokit: Octokit,
  fullName: string,
  installationId: number,
): Promise<string> {
  const { owner, repo } = parseRepoFullName(fullName)

  if (!(await rateLimiter.canProceed(installationId))) {
    await rateLimiter.waitForReset(installationId)
  }

  const { data, headers } = await octokit.request('GET /repos/{owner}/{repo}', {
    owner,
    repo,
  })

  const rateLimit = rateLimiter.extractFromHeaders(headers as Record<string, string>)
  if (rateLimit) {
    await rateLimiter.recordRateLimit(
      installationId,
      rateLimit.remaining,
      rateLimit.limit,
      rateLimit.reset,
    )
  }

  return data.default_branch
}

/**
 * Compare two commits to get only changed files (for incremental sync)
 * Uses GitHub's compare API which is much faster than fetching full tree
 */
export async function compareCommits(
  octokit: Octokit,
  fullName: string,
  baseCommitSha: string,
  headBranch: string,
  installationId: number,
): Promise<CompareResult | null> {
  const { owner, repo } = parseRepoFullName(fullName)

  if (!(await rateLimiter.canProceed(installationId))) {
    await rateLimiter.waitForReset(installationId)
  }

  try {
    // Compare base commit with head of branch
    const { data, headers } = await octokit.request(
      'GET /repos/{owner}/{repo}/compare/{basehead}',
      {
        owner,
        repo,
        basehead: `${baseCommitSha}...${headBranch}`,
      },
    )

    const rateLimit = rateLimiter.extractFromHeaders(headers as Record<string, string>)
    if (rateLimit) {
      await rateLimiter.recordRateLimit(
        installationId,
        rateLimit.remaining,
        rateLimit.limit,
        rateLimit.reset,
      )
    }

    // If commits are identical, no changes
    if (data.status === 'identical') {
      logger.info({ owner, repo, baseCommitSha }, 'No changes since last sync')
      return {
        added: [],
        modified: [],
        removed: [],
        headCommitSha: data.merge_base_commit.sha,
        baseCommitSha,
        totalChanges: 0,
      }
    }

    const added: TreeEntry[] = []
    const modified: TreeEntry[] = []
    const removed: string[] = []

    // Process changed files
    for (const file of data.files || []) {
      // Skip ignored paths
      if (shouldIgnorePath(file.filename)) {
        continue
      }

      if (file.status === 'added') {
        added.push({
          path: file.filename,
          sha: file.sha ?? '',
          size: file.changes, // GitHub doesn't give exact size, use changes as estimate
          type: 'blob',
        })
      } else if (file.status === 'modified' || file.status === 'changed') {
        modified.push({
          path: file.filename,
          sha: file.sha ?? '',
          size: file.changes,
          type: 'blob',
        })
      } else if (file.status === 'removed') {
        removed.push(file.filename)
      } else if (file.status === 'renamed') {
        // Renamed files: remove old, add new
        if (file.previous_filename) {
          removed.push(file.previous_filename)
        }
        added.push({
          path: file.filename,
          sha: file.sha ?? '',
          size: file.changes,
          type: 'blob',
        })
      }
    }

    const totalChanges = added.length + modified.length + removed.length

    logger.info(
      {
        owner,
        repo,
        added: added.length,
        modified: modified.length,
        removed: removed.length,
        totalChanges,
        commits: data.total_commits,
      },
      'Compared commits for incremental sync',
    )

    return {
      added,
      modified,
      removed,
      headCommitSha: data.commits[data.commits.length - 1]?.sha || data.merge_base_commit.sha,
      baseCommitSha,
      totalChanges,
    }
  } catch (error) {
    // If compare fails (e.g., base commit no longer exists), return null to trigger full sync
    logger.warn(
      { error, owner, repo, baseCommitSha },
      'Compare failed, will fall back to full sync',
    )
    return null
  }
}

/**
 * Get the current HEAD commit SHA for a branch
 */
export async function getHeadCommitSha(
  octokit: Octokit,
  fullName: string,
  branch: string,
  installationId: number,
): Promise<string> {
  const { owner, repo } = parseRepoFullName(fullName)

  if (!(await rateLimiter.canProceed(installationId))) {
    await rateLimiter.waitForReset(installationId)
  }

  const { data, headers } = await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}', {
    owner,
    repo,
    branch,
  })

  const rateLimit = rateLimiter.extractFromHeaders(headers as Record<string, string>)
  if (rateLimit) {
    await rateLimiter.recordRateLimit(
      installationId,
      rateLimit.remaining,
      rateLimit.limit,
      rateLimit.reset,
    )
  }

  return data.commit.sha
}
