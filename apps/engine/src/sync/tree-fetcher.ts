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
