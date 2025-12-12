import { db, DependencyProfileStatus, WeaveType as PrismaWeaveType } from '@symploke/db'
import { logger } from '@symploke/logger'
import { compareDependencyProfiles, extractDependencyProfile } from '../dependencies.js'
import type {
  DependencyManifest,
  DependencyProfileMetadata,
  WeaveCandidate,
  WeaveOptions,
  WeaveTypeHandler,
} from './base.js'

/**
 * Dependency Profile WeaveType
 *
 * Finds repositories with similar dependency profiles and tech stacks.
 * Uses AI to:
 * - Extract and categorize dependencies from manifest files
 * - Compare dependency overlap
 * - Generate actionable integration suggestions
 */
export const DependencyProfileWeave: WeaveTypeHandler = {
  id: PrismaWeaveType.dependency_profile,
  name: 'Dependency Profile',
  description: 'Discovers repositories with similar dependency profiles and tech stacks',

  async findWeaves(
    plexusId: string,
    sourceRepoId: string,
    targetRepoId: string,
    options: WeaveOptions = {},
  ): Promise<WeaveCandidate[]> {
    logger.info({ plexusId, sourceRepoId, targetRepoId }, 'Finding dependency profile alignments')

    // Similarity threshold (lower than glossary since deps are more objective)
    const threshold = options.similarityThreshold ?? 0.3

    // Get both repos
    const [sourceRepo, targetRepo] = await Promise.all([
      db.repo.findUnique({ where: { id: sourceRepoId } }),
      db.repo.findUnique({ where: { id: targetRepoId } }),
    ])

    if (!sourceRepo || !targetRepo) {
      logger.warn({ sourceRepoId, targetRepoId }, 'One or both repos not found')
      return []
    }

    // Extract dependency profiles (will use cache if available)
    const [sourceManifests, targetManifests] = await Promise.all([
      extractDependencyProfile(sourceRepoId),
      extractDependencyProfile(targetRepoId),
    ])

    // Get profile records for ecosystem info
    const [sourceProfile, targetProfile] = await Promise.all([
      db.repoDependencyProfile.findUnique({ where: { repoId: sourceRepoId } }),
      db.repoDependencyProfile.findUnique({ where: { repoId: targetRepoId } }),
    ])

    // Check if both have complete profiles
    if (
      !sourceManifests ||
      !targetManifests ||
      !sourceProfile ||
      sourceProfile.status !== DependencyProfileStatus.COMPLETE ||
      !targetProfile ||
      targetProfile.status !== DependencyProfileStatus.COMPLETE
    ) {
      logger.debug(
        {
          sourceRepoId,
          targetRepoId,
          hasSourceManifests: !!sourceManifests,
          hasTargetManifests: !!targetManifests,
          sourceStatus: sourceProfile?.status,
          targetStatus: targetProfile?.status,
        },
        'One or both repos have no dependency manifests',
      )
      return []
    }

    // Compare profiles using AI
    const comparison = await compareDependencyProfiles(
      { fullName: sourceRepo.fullName },
      { fullName: targetRepo.fullName },
      sourceManifests,
      targetManifests,
    )

    logger.info(
      {
        sourceRepoId,
        targetRepoId,
        score: comparison.overlapScore,
        relationshipType: comparison.relationshipType,
        sharedDeps: comparison.sharedDependencies.length,
        sharedFrameworks: comparison.sharedFrameworks.length,
      },
      'Dependency profile comparison complete',
    )

    // Threshold check
    if (comparison.overlapScore < threshold) {
      logger.debug(
        { sourceRepoId, targetRepoId, score: comparison.overlapScore, threshold },
        'Below dependency threshold',
      )
      return []
    }

    // Generate title based on relationship type
    const title = generateTitle(
      sourceRepo.name,
      targetRepo.name,
      comparison.relationshipType,
      comparison.sharedFrameworks,
      comparison.sharedDependencies.length,
    )

    // Check ecosystem match
    const ecosystemMatch =
      sourceProfile.primaryEcosystem === targetProfile.primaryEcosystem &&
      !!sourceProfile.primaryEcosystem

    // Build metadata
    const metadata: DependencyProfileMetadata = {
      sourceManifests: sourceManifests as DependencyManifest[],
      targetManifests: targetManifests as DependencyManifest[],
      sharedDependencies: comparison.sharedDependencies,
      sharedDevDependencies: comparison.sharedDevDependencies,
      sharedFrameworks: comparison.sharedFrameworks,
      overlapScore: comparison.overlapScore,
      frameworkScore: comparison.frameworkScore,
      ecosystemMatch,
      narrative: comparison.narrative,
      integrationSuggestions: comparison.integrationSuggestions,
      relationshipType: comparison.relationshipType,
    }

    const candidate: WeaveCandidate = {
      sourceRepoId,
      targetRepoId,
      type: PrismaWeaveType.dependency_profile,
      score: comparison.overlapScore,
      title,
      description: comparison.narrative,
      filePairs: [], // No file-level matches for dependency profile
      metadata: metadata as unknown as Record<string, unknown>,
    }

    return [candidate]
  },
}

/**
 * Generate a descriptive title based on relationship type
 */
function generateTitle(
  _sourceName: string,
  _targetName: string,
  relationshipType: string,
  sharedFrameworks: string[],
  sharedDepCount: number,
): string {
  switch (relationshipType) {
    case 'same_stack':
      if (sharedFrameworks.length > 0) {
        return `Same stack: ${sharedFrameworks.slice(0, 2).join(', ')}`
      }
      return `Identical tech stack`

    case 'complementary':
      return `Complementary stacks`

    case 'overlapping':
      return `${sharedDepCount} shared dependencies`

    case 'different_ecosystems':
      return `Cross-ecosystem alignment`

    case 'minimal_overlap':
      return `Some shared tooling`

    default:
      return `Shared dependencies`
  }
}
