/**
 * Actionable Weave Finder - Symploke v2 PRD
 *
 * Pipeline:
 * 1. Extract Enhanced Glossaries for all repos
 * 2. Screen all pairs (cheap)
 * 3. Deep analyze promising pairs (expensive)
 * 4. Validate evidence
 * 5. Store and return results
 *
 * Every weave must be:
 * - Understandable in 30 seconds
 * - Validatable in 5 minutes
 * - Implementable today
 */

import { db, WeaveDiscoveryStatus } from '@symploke/db'
import { logger } from '@symploke/logger'
import { notifyWeavesDiscovered } from '../discord/service.js'
import { compareForActionableWeaves } from './actionable-comparison.js'
import { extractEnhancedGlossary } from './enhanced-glossary.js'
import type { ActionableWeave, EnhancedGlossary } from './types/actionable.js'
import { validateWeave } from './validation.js'

// ============================================================================
// TYPES
// ============================================================================

export interface ActionableFinderOptions {
  dryRun?: boolean
  verbose?: boolean
  skipScreening?: boolean // Always do deep analysis (more expensive)
  minScore?: number // Minimum score to save (default: 0.3)
}

export interface ActionableFinderResult {
  runId: string
  plexusId: string
  repoPairs: number
  screened: number
  deepAnalyzed: number
  weavesSaved: number
  duration: number
  weaves: ActionableWeave[]
}

interface LogEntry {
  timestamp: string
  level: 'info' | 'debug' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

// ============================================================================
// MAIN FINDER
// ============================================================================

/**
 * Find actionable weaves across all repositories in a plexus
 */
export async function findActionableWeaves(
  plexusId: string,
  options: ActionableFinderOptions = {},
): Promise<ActionableFinderResult> {
  const startTime = Date.now()
  const logs: LogEntry[] = []
  const verbose = options.verbose ?? false
  const minScore = options.minScore ?? 0.3

  const log = (level: LogEntry['level'], message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    }
    logs.push(entry)

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

  log('info', 'Starting ACTIONABLE weave discovery', { plexusId, options })

  // Fetch plexus info
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
        version: 'actionable-v1',
        minScore,
        skipScreening: options.skipScreening,
        dryRun: options.dryRun,
      },
    },
  })

  log('info', 'Created discovery run', { runId: discoveryRun.id })

  try {
    // Get all repos in the plexus
    const repos = await db.repo.findMany({
      where: { plexusId },
      select: { id: true, name: true, fullName: true },
    })

    log('info', `Found ${repos.length} repos in plexus`)

    if (repos.length < 2) {
      log('warn', 'Not enough repos for weave discovery')
      return finishRun(
        discoveryRun.id,
        plexusId,
        0,
        0,
        0,
        0,
        Date.now() - startTime,
        [],
        logs,
        options.dryRun,
      )
    }

    // Step 1: Extract Enhanced Glossaries
    log('info', 'Step 1: Extracting enhanced glossaries...')
    const glossaries = new Map<string, EnhancedGlossary>()

    for (const repo of repos) {
      log('debug', `Extracting glossary for ${repo.fullName}`)
      const glossary = await extractEnhancedGlossary(repo.id)
      if (glossary) {
        glossaries.set(repo.id, glossary)
        log('debug', `Extracted glossary for ${repo.fullName}`, {
          purpose: glossary.purpose.slice(0, 100),
          exportsCount:
            glossary.exports.functions.length +
            glossary.exports.packages.length +
            glossary.exports.apis.length,
          todosCount: glossary.todos.length,
          maturity: glossary.maturity,
        })
      } else {
        log('warn', `Could not extract glossary for ${repo.fullName}`)
      }
    }

    log('info', `Extracted ${glossaries.size}/${repos.length} glossaries`)

    // Filter to repos with glossaries
    const reposWithGlossaries = repos.filter((r) => glossaries.has(r.id))

    if (reposWithGlossaries.length < 2) {
      log('warn', 'Not enough repos with glossaries for weave discovery')
      return finishRun(
        discoveryRun.id,
        plexusId,
        0,
        0,
        0,
        0,
        Date.now() - startTime,
        [],
        logs,
        options.dryRun,
      )
    }

    // Generate unique repo pairs
    const repoPairs: Array<{ source: (typeof repos)[0]; target: (typeof repos)[0] }> = []
    for (let i = 0; i < reposWithGlossaries.length; i++) {
      for (let j = i + 1; j < reposWithGlossaries.length; j++) {
        repoPairs.push({
          source: reposWithGlossaries[i]!,
          target: reposWithGlossaries[j]!,
        })
      }
    }

    log('info', `Generated ${repoPairs.length} repo pairs for comparison`)

    await db.weaveDiscoveryRun.update({
      where: { id: discoveryRun.id },
      data: { repoPairsTotal: repoPairs.length },
    })

    // Step 2 & 3: Screen and analyze pairs
    log('info', 'Step 2-3: Screening and analyzing pairs...')
    const allWeaves: ActionableWeave[] = []
    let screened = 0
    let deepAnalyzed = 0

    for (const pair of repoPairs) {
      const sourceGlossary = glossaries.get(pair.source.id)!
      const targetGlossary = glossaries.get(pair.target.id)!

      log('debug', `Analyzing ${pair.source.name} <-> ${pair.target.name}`)

      try {
        const weave = await compareForActionableWeaves(
          pair.source.id,
          pair.target.id,
          sourceGlossary,
          targetGlossary,
          pair.source.fullName,
          pair.target.fullName,
          { skipScreening: options.skipScreening },
        )

        screened++

        if (weave) {
          if (weave.analysisDepth === 'deep') {
            deepAnalyzed++
          }

          // Step 4: Validate evidence
          const validatedWeave = await validateWeave(weave)

          // Always collect all weaves - let the UI filter by score
          allWeaves.push(validatedWeave)

          if (validatedWeave.opportunities.length > 0) {
            log('info', `Found actionable weave: ${pair.source.name} <-> ${pair.target.name}`, {
              score: validatedWeave.score,
              opportunities: validatedWeave.opportunities.length,
              types: validatedWeave.opportunities.map((o) => o.type),
              titles: validatedWeave.opportunities.map((o) => o.title),
            })
          } else {
            log(
              'debug',
              `Weave with no opportunities: ${pair.source.name} <-> ${pair.target.name} (${validatedWeave.score.toFixed(2)})`,
            )
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log('error', `Error analyzing pair ${pair.source.name} <-> ${pair.target.name}`, {
          error: message,
        })
      }

      // Update progress
      await db.weaveDiscoveryRun.update({
        where: { id: discoveryRun.id },
        data: { repoPairsChecked: screened },
      })
    }

    log('info', `Analysis complete: ${allWeaves.length} actionable weaves found`, {
      screened,
      deepAnalyzed,
      withOpportunities: allWeaves.filter((w) => w.opportunities.length > 0).length,
    })

    // Step 5: Save weaves to database
    let saved = 0

    if (!options.dryRun) {
      log('info', 'Step 5: Saving weaves to database...')

      for (const weave of allWeaves) {
        // Save all weaves - let the UI filter by score
        try {
          // Generate title from best opportunity
          const bestOpportunity = weave.opportunities[0]
          const title = bestOpportunity?.title || 'Integration Opportunity'

          // Generate description
          const description =
            bestOpportunity?.description ||
            weave.noOpportunityReason ||
            'Potential integration opportunity'

          // Find repo names for the weave
          const sourceRepo = repos.find((r) => r.id === weave.sourceRepoId)
          const targetRepo = repos.find((r) => r.id === weave.targetRepoId)

          await db.weave.create({
            data: {
              plexusId,
              sourceRepoId: weave.sourceRepoId,
              targetRepoId: weave.targetRepoId,
              discoveryRunId: discoveryRun.id,
              type: 'integration_opportunity',
              title: `${sourceRepo?.name} + ${targetRepo?.name}: ${title}`,
              description,
              score: weave.score,
              metadata: {
                version: 'actionable-v1',
                analysisDepth: weave.analysisDepth,
                opportunities: weave.opportunities,
                noOpportunityReason: weave.noOpportunityReason,
              },
            },
          })

          saved++
          log('info', `Saved weave: ${title}`, {
            score: weave.score,
            opportunities: weave.opportunities.length,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          log('error', 'Error saving weave', { error: message })
        }
      }
    } else {
      log('info', 'Dry run - not saving weaves to database')
      // In dry run, count all weaves that would be saved
      saved = allWeaves.length
    }

    const duration = Date.now() - startTime

    log('info', 'Actionable weave discovery complete', {
      repoPairs: repoPairs.length,
      screened,
      deepAnalyzed,
      weavesSaved: saved,
      duration: `${(duration / 1000).toFixed(1)}s`,
    })

    // Send Discord notification
    const repoMap = new Map(repos.map((r) => [r.id, r]))
    const weaveInfo = allWeaves
      .filter((w) => w.opportunities.length > 0)
      .slice(0, 10)
      .map((w) => {
        const sourceRepo = repoMap.get(w.sourceRepoId)
        const targetRepo = repoMap.get(w.targetRepoId)
        const bestOpp = w.opportunities[0]
        return {
          title: bestOpp?.title || 'Integration Opportunity',
          description: bestOpp?.description || '',
          score: w.score,
          sourceRepo: sourceRepo?.fullName || w.sourceRepoId,
          targetRepo: targetRepo?.fullName || w.targetRepoId,
          type: bestOpp?.type || 'unknown',
        }
      })

    await notifyWeavesDiscovered({
      plexusName: plexus.name,
      plexusSlug: plexus.slug,
      repoPairsAnalyzed: repoPairs.length,
      candidatesFound: allWeaves.length,
      weavesSaved: saved,
      weavesSkipped: allWeaves.length - saved,
      duration,
      runId: discoveryRun.id,
      weaves: weaveInfo,
    })

    return finishRun(
      discoveryRun.id,
      plexusId,
      repoPairs.length,
      screened,
      deepAnalyzed,
      saved,
      duration,
      allWeaves,
      logs,
      options.dryRun,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log('error', 'Actionable weave discovery failed', { error: message })

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

// ============================================================================
// HELPERS
// ============================================================================

async function finishRun(
  runId: string,
  plexusId: string,
  repoPairs: number,
  screened: number,
  deepAnalyzed: number,
  saved: number,
  duration: number,
  weaves: ActionableWeave[],
  logs: LogEntry[],
  dryRun?: boolean,
): Promise<ActionableFinderResult> {
  if (!dryRun) {
    await db.weaveDiscoveryRun.update({
      where: { id: runId },
      data: {
        status: WeaveDiscoveryStatus.COMPLETED,
        repoPairsChecked: screened,
        candidatesFound: weaves.length,
        weavesSaved: saved,
        weavesSkipped: weaves.length - saved,
        logs,
        completedAt: new Date(),
      },
    })
  }

  return {
    runId,
    plexusId,
    repoPairs,
    screened,
    deepAnalyzed,
    weavesSaved: saved,
    duration,
    weaves,
  }
}
