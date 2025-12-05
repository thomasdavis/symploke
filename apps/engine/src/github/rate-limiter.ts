import { db } from '@symploke/db'
import { logger } from '@symploke/logger'
import { config } from '../config.js'

export interface RateLimitInfo {
  remaining: number
  limit: number
  resetAt: Date
}

/**
 * Rate limiter for GitHub API requests
 * Tracks rate limits per installation and pauses when approaching limit
 */
export class RateLimiter {
  private inMemoryCache: Map<number, RateLimitInfo> = new Map()

  /**
   * Check if we can proceed with a request for this installation
   */
  async canProceed(installationId: number): Promise<boolean> {
    const info = await this.getRateLimitInfo(installationId)
    if (!info) {
      // No rate limit info yet, assume we can proceed
      return true
    }

    // Check if we've passed the reset time
    if (new Date() > info.resetAt) {
      return true
    }

    // Check if we have enough remaining requests
    return info.remaining > config.RATE_LIMIT_BUFFER
  }

  /**
   * Get the wait time in ms until rate limit resets
   */
  async getWaitTime(installationId: number): Promise<number> {
    const info = await this.getRateLimitInfo(installationId)
    if (!info) return 0

    const now = new Date()
    if (now > info.resetAt) return 0

    return info.resetAt.getTime() - now.getTime()
  }

  /**
   * Wait until rate limit resets for this installation
   */
  async waitForReset(installationId: number): Promise<void> {
    const waitTime = await this.getWaitTime(installationId)
    if (waitTime > 0) {
      logger.info({ installationId, waitTime }, 'Waiting for rate limit reset')
      await new Promise((resolve) => setTimeout(resolve, waitTime + 1000)) // Add 1s buffer
    }
  }

  /**
   * Record rate limit info from GitHub API response headers
   */
  async recordRateLimit(
    installationId: number,
    remaining: number,
    limit: number,
    resetTimestamp: number,
  ): Promise<void> {
    const resetAt = new Date(resetTimestamp * 1000)

    // Update in-memory cache
    this.inMemoryCache.set(installationId, { remaining, limit, resetAt })

    // Update database
    try {
      await db.gitHubRateLimit.upsert({
        where: { installationId },
        create: {
          installationId,
          remaining,
          limit,
          resetAt,
        },
        update: {
          remaining,
          limit,
          resetAt,
        },
      })
    } catch (error) {
      logger.error({ error, installationId }, 'Failed to persist rate limit info')
    }
  }

  /**
   * Get rate limit info for an installation
   */
  private async getRateLimitInfo(installationId: number): Promise<RateLimitInfo | null> {
    // Check in-memory cache first
    const cached = this.inMemoryCache.get(installationId)
    if (cached) {
      return cached
    }

    // Fall back to database
    try {
      const record = await db.gitHubRateLimit.findUnique({
        where: { installationId },
      })

      if (record) {
        const info: RateLimitInfo = {
          remaining: record.remaining,
          limit: record.limit,
          resetAt: record.resetAt,
        }
        this.inMemoryCache.set(installationId, info)
        return info
      }
    } catch (error) {
      logger.error({ error, installationId }, 'Failed to fetch rate limit info')
    }

    return null
  }

  /**
   * Extract rate limit info from Octokit response headers
   */
  extractFromHeaders(headers: Record<string, string | undefined>): {
    remaining: number
    limit: number
    reset: number
  } | null {
    const remaining = headers['x-ratelimit-remaining']
    const limit = headers['x-ratelimit-limit']
    const reset = headers['x-ratelimit-reset']

    if (remaining && limit && reset) {
      return {
        remaining: parseInt(remaining, 10),
        limit: parseInt(limit, 10),
        reset: parseInt(reset, 10),
      }
    }

    return null
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()
