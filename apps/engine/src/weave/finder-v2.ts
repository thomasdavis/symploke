/**
 * Weave Finder V2 - Ontology-First Approach
 *
 * Pipeline:
 * 1. Profile each repository (extract conceptual model from README + package.json)
 * 2. Match profiles using ontology rules (capability-need matching)
 * 3. Assess candidates with LLM (verify real opportunities)
 * 4. Create weaves for validated opportunities
 *
 * Key insight: We understand what repos DO, not what their code looks like.
 */

import { db, WeaveType } from '@symploke/db'
import { logger } from '@symploke/logger'
import { profilePlexusRepos, profileRepository } from './profiler'
import { findAndAssessRelationships } from './matcher'
import type { RepoProfile } from './ontology'

export interface FinderV2Options {
  /** Minimum confidence to create a weave (0-1) */
  minConfidence?: number
  /** Maximum candidates to assess per run */
  maxCandidates?: number
  /** Run without creating weaves */
  dryRun?: boolean
  /** Verbose logging */
  verbose?: boolean
}

export interface FinderV2Result {
  runId: string
  profiles: RepoProfile[]
  candidatesFound: number
  weavesCreated: number
  duration: number
  weaves: Array<{
    sourceRepo: string
    targetRepo: string
    title: string
    description: string
    confidence: number
  }>
}

/**
 * Find weaves using ontology-first approach
 */
export async function findWeavesV2(
  plexusId: string,
  options: FinderV2Options = {},
): Promise<FinderV2Result> {
  const { minConfidence = 0.6, maxCandidates = 20, dryRun = false, verbose = false } = options

  const startTime = Date.now()

  logger.info({ plexusId, options }, 'Starting weave discovery v2 (ontology-first)')

  // Create discovery run
  const run = await db.weaveDiscoveryRun.create({
    data: {
      plexusId,
      status: 'RUNNING',
      config: { version: 2, minConfidence, maxCandidates, dryRun },
    },
  })

  try {
    // Stage 1: Profile all repositories
    logger.info('Stage 1: Profiling repositories...')
    const profiles = await profilePlexusRepos(plexusId)

    if (profiles.length < 2) {
      logger.warn('Need at least 2 profiled repositories to find weaves')
      await completeRun(run.id, 'COMPLETED', { candidatesFound: 0, weavesSaved: 0 })
      return {
        runId: run.id,
        profiles,
        candidatesFound: 0,
        weavesCreated: 0,
        duration: Date.now() - startTime,
        weaves: [],
      }
    }

    // Log profiles if verbose
    if (verbose) {
      for (const profile of profiles) {
        logger.info(
          {
            repo: profile.fullName,
            purpose: profile.purpose,
            capabilities: profile.capabilities,
            produces: profile.artifacts.produces,
            roles: profile.roles,
            confidence: profile.confidence,
          },
          'Repository profile',
        )
      }
    }

    // Stage 2 & 3: Find and assess relationships
    logger.info('Stage 2-3: Finding and assessing relationships...')
    const validatedRelationships = await findAndAssessRelationships(profiles, {
      maxCandidates,
      minConfidence,
    })

    logger.info(
      { validatedCount: validatedRelationships.length },
      'Relationship assessment complete',
    )

    // Stage 4: Create weaves
    const createdWeaves: FinderV2Result['weaves'] = []

    if (!dryRun && validatedRelationships.length > 0) {
      logger.info('Stage 4: Creating weaves...')

      for (const { candidate, assessment } of validatedRelationships) {
        // Check if weave already exists
        const existing = await db.weave.findFirst({
          where: {
            plexusId,
            sourceRepoId: candidate.sourceRepo.repoId,
            targetRepoId: candidate.targetRepo.repoId,
          },
        })

        if (existing) {
          logger.debug(
            { source: candidate.sourceRepo.fullName, target: candidate.targetRepo.fullName },
            'Weave already exists, skipping',
          )
          continue
        }

        // Create the weave
        const weave = await db.weave.create({
          data: {
            plexusId,
            discoveryRunId: run.id,
            sourceRepoId: candidate.sourceRepo.repoId,
            targetRepoId: candidate.targetRepo.repoId,
            type: WeaveType.integration_opportunity,
            score: assessment.confidence,
            title: assessment.title,
            description: assessment.description,
            metadata: {
              version: 2,
              relationshipType: candidate.relationshipType,
              hypothesis: candidate.hypothesis,
              specificIntegration: assessment.specificIntegration,
              valueProposition: assessment.valueProposition,
              reasoning: assessment.reasoning,
              sourceProfile: {
                purpose: candidate.sourceRepo.purpose,
                capabilities: candidate.sourceRepo.capabilities,
                roles: candidate.sourceRepo.roles,
              },
              targetProfile: {
                purpose: candidate.targetRepo.purpose,
                capabilities: candidate.targetRepo.capabilities,
                roles: candidate.targetRepo.roles,
              },
            },
          },
        })

        createdWeaves.push({
          sourceRepo: candidate.sourceRepo.fullName,
          targetRepo: candidate.targetRepo.fullName,
          title: assessment.title,
          description: assessment.description,
          confidence: assessment.confidence,
        })

        logger.info(
          {
            weaveId: weave.id,
            source: candidate.sourceRepo.fullName,
            target: candidate.targetRepo.fullName,
            title: assessment.title,
            confidence: assessment.confidence,
          },
          'Created weave',
        )
      }
    } else if (dryRun) {
      // Log what would be created
      for (const { candidate, assessment } of validatedRelationships) {
        createdWeaves.push({
          sourceRepo: candidate.sourceRepo.fullName,
          targetRepo: candidate.targetRepo.fullName,
          title: assessment.title,
          description: assessment.description,
          confidence: assessment.confidence,
        })

        logger.info(
          {
            source: candidate.sourceRepo.fullName,
            target: candidate.targetRepo.fullName,
            title: assessment.title,
            confidence: assessment.confidence,
          },
          '[DRY RUN] Would create weave',
        )
      }
    }

    // Complete run
    const duration = Date.now() - startTime
    await completeRun(run.id, 'COMPLETED', {
      candidatesFound: validatedRelationships.length,
      weavesSaved: dryRun ? 0 : createdWeaves.length,
    })

    const result: FinderV2Result = {
      runId: run.id,
      profiles,
      candidatesFound: validatedRelationships.length,
      weavesCreated: dryRun ? 0 : createdWeaves.length,
      duration,
      weaves: createdWeaves,
    }

    logger.info(
      {
        runId: run.id,
        profiles: profiles.length,
        candidatesFound: validatedRelationships.length,
        weavesCreated: result.weavesCreated,
        duration: `${(duration / 1000).toFixed(1)}s`,
      },
      'Weave discovery v2 complete',
    )

    return result
  } catch (error) {
    logger.error({ error, runId: run.id }, 'Weave discovery v2 failed')
    await completeRun(run.id, 'FAILED', {})
    throw error
  }
}

async function completeRun(
  runId: string,
  status: 'COMPLETED' | 'FAILED',
  stats: { candidatesFound?: number; weavesSaved?: number; weavesSkipped?: number } = {},
): Promise<void> {
  await db.weaveDiscoveryRun.update({
    where: { id: runId },
    data: {
      status,
      completedAt: new Date(),
      ...(stats.candidatesFound !== undefined && { candidatesFound: stats.candidatesFound }),
      ...(stats.weavesSaved !== undefined && { weavesSaved: stats.weavesSaved }),
      ...(stats.weavesSkipped !== undefined && { weavesSkipped: stats.weavesSkipped }),
    },
  })
}

/**
 * Profile a single repository (useful for testing)
 */
export { profileRepository }
