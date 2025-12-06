import { db, type WeaveType as PrismaWeaveType, WeaveDiscoveryStatus } from '@symploke/db'
import { logger } from '@symploke/logger'
import { findTopSimilarChunks, getRepoChunkCounts } from './similarity.js'
import type { WeaveCandidate, WeaveOptions, WeaveTypeHandler } from './types/base.js'
import { IntegrationOpportunityWeave } from './types/integration-opportunity.js'
import { notifyWeavesDiscovered } from '../discord/service.js'

/**
 * Registry of all weave type handlers
 */
const WEAVE_TYPES: WeaveTypeHandler[] = [IntegrationOpportunityWeave]

export interface FinderOptions extends WeaveOptions {
  weaveTypes?: PrismaWeaveType[] // Which types to run (default: all)
  dryRun?: boolean // Don't save weaves to database
  verbose?: boolean // Enable verbose logging
}

export interface FinderResult {
  runId: string
  plexusId: string
  repoPairs: number
  candidates: WeaveCandidate[]
  saved: number
  skipped: number
  duration: number
  logs: LogEntry[]
}

export interface LogEntry {
  timestamp: string
  level: 'info' | 'debug' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

/**
 * Discover weaves across all repositories in a plexus
 */
export async function findWeaves(
  plexusId: string,
  options: FinderOptions = {},
): Promise<FinderResult> {
  const startTime = Date.now()
  const logs: LogEntry[] = []
  const verbose = options.verbose ?? false

  const log = (level: LogEntry['level'], message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    }
    logs.push(entry)

    // Also log to stdout
    if (level === 'error') {
      logger.error(data || {}, message)
    } else if (level === 'warn') {
      logger.warn(data || {}, message)
    } else if (level === 'debug' && verbose) {
      logger.debug(data || {}, message)
    } else if (level === 'info') {
      logger.info(data || {}, message)
    }
  }

  log('info', 'Starting weave discovery', { plexusId, options })

  // Fetch plexus info for notifications
  const plexus = await db.plexus.findUnique({
    where: { id: plexusId },
    select: { name: true, slug: true },
  })

  if (!plexus) {
    throw new Error(`Plexus not found: ${plexusId}`)
  }

  // Create discovery run record
  const discoveryRun = await db.weaveDiscoveryRun.create({
    data: {
      plexusId,
      config: {
        similarityThreshold: options.similarityThreshold,
        maxChunkPairs: options.maxChunkPairs,
        minMatchingChunks: options.minMatchingChunks,
        minFilePairSimilarity: options.minFilePairSimilarity,
        maxFilePairsToLLM: options.maxFilePairsToLLM,
        llmScoreThreshold: options.llmScoreThreshold,
        dryRun: options.dryRun,
        weaveTypes: options.weaveTypes,
      },
    },
  })

  log('info', 'Created discovery run', { runId: discoveryRun.id })

  try {
    // Get all repos in the plexus with embedded chunks
    const repos = await db.repo.findMany({
      where: { plexusId },
      select: { id: true, name: true, fullName: true },
    })

    log('info', `Found ${repos.length} repos in plexus`)

    if (repos.length < 2) {
      log('warn', 'Not enough repos for weave discovery', { repoCount: repos.length })
      return finishRun(
        discoveryRun.id,
        'COMPLETED',
        0,
        [],
        0,
        0,
        Date.now() - startTime,
        logs,
        options.dryRun,
      )
    }

    // Get chunk counts to filter out repos without embeddings
    const chunkCounts = await getRepoChunkCounts(plexusId)
    const reposWithChunks = repos.filter((r) => (chunkCounts.get(r.id) || 0) > 0)

    for (const repo of repos) {
      const chunks = chunkCounts.get(repo.id) || 0
      log('debug', `Repo: ${repo.fullName}`, { repoId: repo.id, chunks, hasEmbeddings: chunks > 0 })
    }

    log('info', `${reposWithChunks.length}/${repos.length} repos have embeddings`)

    if (reposWithChunks.length < 2) {
      log('warn', 'Not enough repos with embeddings for weave discovery')
      return finishRun(
        discoveryRun.id,
        'COMPLETED',
        0,
        [],
        0,
        0,
        Date.now() - startTime,
        logs,
        options.dryRun,
      )
    }

    // Generate unique repo pairs (A→B, not both A→B and B→A)
    const repoPairs: Array<{ source: (typeof repos)[0]; target: (typeof repos)[0] }> = []
    for (let i = 0; i < reposWithChunks.length; i++) {
      for (let j = i + 1; j < reposWithChunks.length; j++) {
        repoPairs.push({
          source: reposWithChunks[i]!,
          target: reposWithChunks[j]!,
        })
      }
    }

    log('info', `Generated ${repoPairs.length} repo pairs for comparison`)

    await db.weaveDiscoveryRun.update({
      where: { id: discoveryRun.id },
      data: { repoPairsTotal: repoPairs.length },
    })

    // Determine which weave types to run
    const typesToRun = options.weaveTypes
      ? WEAVE_TYPES.filter((t) => options.weaveTypes!.includes(t.id))
      : WEAVE_TYPES

    log('info', `Running ${typesToRun.length} weave type(s)`, {
      types: typesToRun.map((t) => t.id),
    })

    // Find candidates across all pairs and types
    const allCandidates: WeaveCandidate[] = []
    const nearMissCandidates: Array<{
      sourceRepo: string
      targetRepo: string
      topMatches: Array<{ sourceFile: string; targetFile: string; similarity: number }>
    }> = []
    let pairsChecked = 0

    for (const pair of repoPairs) {
      for (const weaveType of typesToRun) {
        log('debug', `Checking pair: ${pair.source.fullName} <-> ${pair.target.fullName}`, {
          type: weaveType.id,
          sourceId: pair.source.id,
          targetId: pair.target.id,
        })

        try {
          const candidates = await weaveType.findWeaves(
            plexusId,
            pair.source.id,
            pair.target.id,
            options,
          )

          if (candidates.length > 0) {
            log(
              'info',
              `Found ${candidates.length} candidate(s) for ${pair.source.name} <-> ${pair.target.name}`,
              {
                candidates: candidates.map((c) => ({
                  type: c.type,
                  score: c.score,
                  title: c.title,
                  filePairCount: c.filePairs.length,
                })),
              },
            )
            allCandidates.push(...candidates)
          } else {
            log('debug', `No candidates for ${pair.source.name} <-> ${pair.target.name}`)

            // Collect near-miss info for pairs that didn't produce weaves
            try {
              const topChunks = await findTopSimilarChunks(pair.source.id, pair.target.id, 10)
              if (topChunks.length > 0) {
                nearMissCandidates.push({
                  sourceRepo: pair.source.fullName,
                  targetRepo: pair.target.fullName,
                  topMatches: topChunks.map((c) => ({
                    sourceFile: c.source_path,
                    targetFile: c.target_path,
                    similarity: c.similarity,
                  })),
                })
              }
            } catch {
              // Ignore errors collecting near-miss data
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          log('error', `Error finding weaves for pair`, {
            source: pair.source.id,
            target: pair.target.id,
            type: weaveType.id,
            error: message,
          })
        }
      }

      pairsChecked++
      await db.weaveDiscoveryRun.update({
        where: { id: discoveryRun.id },
        data: { repoPairsChecked: pairsChecked },
      })
    }

    log('info', `Weave discovery complete: ${allCandidates.length} candidates found`)

    // Log near-miss candidates (pairs that didn't pass threshold)
    if (nearMissCandidates.length > 0) {
      // Flatten all matches and sort by similarity
      const allNearMisses = nearMissCandidates
        .flatMap((c) =>
          c.topMatches.map((m) => ({
            repos: `${c.sourceRepo} <-> ${c.targetRepo}`,
            sourceFile: m.sourceFile,
            targetFile: m.targetFile,
            similarity: m.similarity,
          })),
        )
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)

      log('info', 'Top 10 near-miss candidates (below threshold)', {
        threshold: options.similarityThreshold ?? 0.85,
        nearMisses: allNearMisses.map((m) => ({
          repos: m.repos,
          files: `${m.sourceFile} <-> ${m.targetFile}`,
          similarity: `${(m.similarity * 100).toFixed(1)}%`,
        })),
      })
    }

    // Save candidates to database (unless dry run)
    let saved = 0
    let skipped = 0

    if (!options.dryRun) {
      for (const candidate of allCandidates) {
        try {
          // Check if this weave already exists (by repo pair and type)
          const existing = await db.weave.findFirst({
            where: {
              plexusId,
              OR: [
                {
                  sourceRepoId: candidate.sourceRepoId,
                  targetRepoId: candidate.targetRepoId,
                },
                {
                  sourceRepoId: candidate.targetRepoId,
                  targetRepoId: candidate.sourceRepoId,
                },
              ],
              type: candidate.type,
              dismissed: false,
            },
          })

          if (existing) {
            log('debug', `Weave already exists, skipping`, {
              existingId: existing.id,
              type: candidate.type,
            })
            skipped++
            continue
          }

          // Create the weave with metadata
          const weave = await db.weave.create({
            data: {
              plexusId,
              sourceRepoId: candidate.sourceRepoId,
              targetRepoId: candidate.targetRepoId,
              discoveryRunId: discoveryRun.id,
              type: candidate.type,
              title: candidate.title,
              description: candidate.description,
              score: candidate.score,
              metadata: {
                filePairs: candidate.filePairs.map((fp) => ({
                  sourceFile: fp.sourceFile,
                  targetFile: fp.targetFile,
                  avgSimilarity: fp.avgSimilarity,
                  maxSimilarity: fp.maxSimilarity,
                  chunkCount: fp.chunkCount,
                })),
              },
            },
          })

          log('info', `Created weave: ${weave.title}`, {
            weaveId: weave.id,
            type: weave.type,
            score: weave.score,
          })
          saved++
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          log('error', 'Error saving weave', { candidate: candidate.title, error: message })
        }
      }
    } else {
      log('info', 'Dry run - not saving weaves to database')
    }

    const duration = Date.now() - startTime

    log('info', 'Weave finder complete', {
      repoPairs: repoPairs.length,
      candidates: allCandidates.length,
      saved,
      skipped,
      duration: `${(duration / 1000).toFixed(1)}s`,
    })

    // Build weave info for Discord notification
    const repoMap = new Map(repos.map((r) => [r.id, r]))
    const weaveInfo = allCandidates.map((c) => {
      const sourceRepo = repoMap.get(c.sourceRepoId)
      const targetRepo = repoMap.get(c.targetRepoId)
      return {
        title: c.title,
        description: c.description,
        score: c.score,
        sourceRepo: sourceRepo?.fullName || c.sourceRepoId,
        targetRepo: targetRepo?.fullName || c.targetRepoId,
        type: c.type,
      }
    })

    // Send Discord notification
    await notifyWeavesDiscovered({
      plexusName: plexus.name,
      plexusSlug: plexus.slug,
      repoPairsAnalyzed: repoPairs.length,
      candidatesFound: allCandidates.length,
      weavesSaved: saved,
      weavesSkipped: skipped,
      duration,
      runId: discoveryRun.id,
      weaves: weaveInfo,
    })

    return finishRun(
      discoveryRun.id,
      'COMPLETED',
      repoPairs.length,
      allCandidates,
      saved,
      skipped,
      duration,
      logs,
      options.dryRun,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log('error', 'Weave discovery failed', { error: message })

    await db.weaveDiscoveryRun.update({
      where: { id: discoveryRun.id },
      data: {
        status: WeaveDiscoveryStatus.FAILED,
        error: message,
        logs,
        completedAt: new Date(),
      },
    })

    throw error
  }
}

async function finishRun(
  runId: string,
  status: 'COMPLETED' | 'FAILED',
  repoPairs: number,
  candidates: WeaveCandidate[],
  saved: number,
  skipped: number,
  duration: number,
  logs: LogEntry[],
  dryRun?: boolean,
): Promise<FinderResult> {
  if (!dryRun) {
    await db.weaveDiscoveryRun.update({
      where: { id: runId },
      data: {
        status: WeaveDiscoveryStatus[status],
        repoPairsChecked: repoPairs,
        candidatesFound: candidates.length,
        weavesSaved: saved,
        weavesSkipped: skipped,
        logs,
        completedAt: new Date(),
      },
    })
  }

  return {
    runId,
    plexusId: '',
    repoPairs,
    candidates,
    saved,
    skipped,
    duration,
    logs,
  }
}

/**
 * List existing weaves for a plexus
 */
export async function listWeaves(plexusId: string) {
  return db.weave.findMany({
    where: { plexusId, dismissed: false },
    include: {
      sourceRepo: { select: { name: true, fullName: true } },
      targetRepo: { select: { name: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * List discovery runs for a plexus
 */
export async function listDiscoveryRuns(plexusId: string, limit: number = 20) {
  return db.weaveDiscoveryRun.findMany({
    where: { plexusId },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })
}

/**
 * Get a discovery run with full logs
 */
export async function getDiscoveryRun(runId: string) {
  return db.weaveDiscoveryRun.findUnique({
    where: { id: runId },
    include: {
      plexus: { select: { name: true, slug: true } },
    },
  })
}
