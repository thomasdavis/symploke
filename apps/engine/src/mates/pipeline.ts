import { db, MatesProfileStatus } from '@symploke/db'
import { logger } from '@symploke/logger'
import { crawlGitHubUser, type CrawledActivity } from './crawler.js'
import { buildDeveloperProfile } from './profiler.js'
import { embedProfileFacets } from './embedder.js'
import { findMatesMatches } from './matcher.js'
import type { PusherService } from '../pusher/service.js'

interface PipelineOptions {
  pusher?: PusherService
}

/**
 * Update profile status and emit Pusher event
 */
async function updateStatus(
  profileId: string,
  username: string,
  status: MatesProfileStatus,
  step: string,
  pusher?: PusherService,
  error?: string,
) {
  await db.matesProfile.update({
    where: { id: profileId },
    data: {
      status,
      ...(error ? { error } : {}),
    },
  })

  if (pusher) {
    await pusher.emitMatesStatus(username, { profileId, status, step, error })
  }
}

// ---- Individual stage processors ----

/**
 * Stage 1: Crawl GitHub data
 */
export async function processCrawl(profileId: string, opts: PipelineOptions = {}): Promise<void> {
  const profile = await db.matesProfile.findUniqueOrThrow({
    where: { id: profileId },
    select: { id: true, username: true },
  })

  const { username } = profile

  try {
    await updateStatus(
      profileId,
      username,
      MatesProfileStatus.CRAWLING,
      'Crawling GitHub activity...',
      opts.pusher,
    )

    const activity = await crawlGitHubUser(username, (step) => {
      opts.pusher?.emitMatesProgress(username, step)
    })

    await db.matesProfile.update({
      where: { id: profileId },
      data: {
        githubId: activity.user.id,
        avatarUrl: activity.user.avatarUrl,
        bio: activity.user.bio,
        company: activity.user.company,
        location: activity.user.location,
        blog: activity.user.blog,
        rawActivity: activity as unknown as Record<string, unknown>,
        lastCrawledAt: new Date(),
      },
    })

    logger.info({ profileId, username, repoCount: activity.repos.length }, 'Crawl complete')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await updateStatus(
      profileId,
      username,
      MatesProfileStatus.FAILED,
      'Crawl failed',
      opts.pusher,
      message,
    )
    throw error
  }
}

/**
 * Stage 2: Summarize and build profile
 */
export async function processProfile(profileId: string, opts: PipelineOptions = {}): Promise<void> {
  const profile = await db.matesProfile.findUniqueOrThrow({
    where: { id: profileId },
    select: { id: true, username: true, rawActivity: true },
  })

  const { username } = profile

  try {
    await updateStatus(
      profileId,
      username,
      MatesProfileStatus.SUMMARIZING,
      'Analyzing your code...',
      opts.pusher,
    )

    const activity = profile.rawActivity as unknown as CrawledActivity
    if (!activity) throw new Error('No raw activity data')

    const devProfile = await buildDeveloperProfile(activity, (step) => {
      opts.pusher?.emitMatesProgress(username, step)
    })

    await db.matesProfile.update({
      where: { id: profileId },
      data: {
        profileText: devProfile.profileText,
        facets: devProfile.facets,
      },
    })

    logger.info(
      { profileId, username, facetCount: devProfile.facets.length },
      'Profile synthesized',
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await updateStatus(
      profileId,
      username,
      MatesProfileStatus.FAILED,
      'Profile synthesis failed',
      opts.pusher,
      message,
    )
    throw error
  }
}

/**
 * Stage 3: Embed profile facets
 */
export async function processEmbed(profileId: string, opts: PipelineOptions = {}): Promise<void> {
  const profile = await db.matesProfile.findUniqueOrThrow({
    where: { id: profileId },
    select: { id: true, username: true },
  })

  const { username } = profile

  try {
    await updateStatus(
      profileId,
      username,
      MatesProfileStatus.EMBEDDING,
      'Generating embeddings...',
      opts.pusher,
    )

    const chunkCount = await embedProfileFacets(profileId, (step) => {
      opts.pusher?.emitMatesProgress(username, step)
    })

    logger.info({ profileId, username, chunkCount }, 'Facets embedded')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await updateStatus(
      profileId,
      username,
      MatesProfileStatus.FAILED,
      'Embedding failed',
      opts.pusher,
      message,
    )
    throw error
  }
}

/**
 * Stage 4: Find matches
 */
export async function processMatch(profileId: string, opts: PipelineOptions = {}): Promise<void> {
  const profile = await db.matesProfile.findUniqueOrThrow({
    where: { id: profileId },
    select: { id: true, username: true },
  })

  const { username } = profile

  try {
    await updateStatus(
      profileId,
      username,
      MatesProfileStatus.MATCHING,
      'Finding your mates...',
      opts.pusher,
    )

    const matchCount = await findMatesMatches(profileId, (step) => {
      opts.pusher?.emitMatesProgress(username, step)
    })

    await updateStatus(profileId, username, MatesProfileStatus.READY, 'Profile ready!', opts.pusher)

    // Emit profile-ready event
    if (opts.pusher) {
      await opts.pusher.emitMatesProfileReady(username, { profileId, matchCount })
    }

    logger.info({ profileId, username, matchCount }, 'Matching complete, profile ready')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await updateStatus(
      profileId,
      username,
      MatesProfileStatus.FAILED,
      'Matching failed',
      opts.pusher,
      message,
    )
    throw error
  }
}

/**
 * Run the entire pipeline synchronously (for immediate processing)
 */
export async function runFullPipeline(
  profileId: string,
  opts: PipelineOptions = {},
): Promise<void> {
  await processCrawl(profileId, opts)
  await processProfile(profileId, opts)
  await processEmbed(profileId, opts)
  await processMatch(profileId, opts)
}
