/**
 * Relationship Matcher
 *
 * Matches repository profiles using the ontology to find candidate integrations.
 * This is capability-need matching, not text similarity.
 */

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { logger } from '@symploke/logger'
import {
  RELATIONSHIP_RULES,
  type RepoProfile,
  type RelationshipCandidate,
  type RelationshipType,
} from './ontology'

/**
 * Schema for LLM relationship assessment
 */
const RelationshipAssessmentSchema = z.object({
  isValidOpportunity: z.boolean().describe('Is this a real, actionable integration opportunity?'),
  title: z
    .string()
    .describe(
      'Short title for this integration opportunity (e.g., "Use blocks to analyze tpmjs tools")',
    ),
  description: z.string().describe('Detailed explanation of how these repos could integrate'),
  specificIntegration: z
    .string()
    .nullable()
    .describe(
      'Concrete, actionable suggestion (e.g., "Run blocks drift analysis on packages/tools directory"). Can be null if not a valid opportunity.',
    ),
  valueProposition: z
    .string()
    .nullable()
    .describe(
      'What benefit would this integration provide? Can be null if not a valid opportunity.',
    ),
  confidence: z.number().min(0).max(1).describe('Confidence this is a valuable opportunity (0-1)'),
  reasoning: z.string().describe('Your reasoning for this assessment'),
})

type RelationshipAssessment = z.infer<typeof RelationshipAssessmentSchema>

/**
 * Find candidate relationships using ontology rules
 */
export function findCandidateRelationships(profiles: RepoProfile[]): RelationshipCandidate[] {
  const candidates: RelationshipCandidate[] = []

  // Check all pairs
  for (let i = 0; i < profiles.length; i++) {
    for (let j = 0; j < profiles.length; j++) {
      if (i === j) continue

      const source = profiles[i]!
      const target = profiles[j]!

      // Apply each rule
      for (const rule of RELATIONSHIP_RULES) {
        if (rule.match(source, target)) {
          const candidate: RelationshipCandidate = {
            sourceRepo: source,
            targetRepo: target,
            relationshipType: rule.relationshipType,
            hypothesis: `${rule.name}: ${rule.description}`,
            matchedCapabilities: findMatchedCapabilities(source, target, rule.relationshipType),
            matchedArtifacts: findMatchedArtifacts(source, target),
            confidence: calculateInitialConfidence(source, target, rule),
          }

          candidates.push(candidate)

          logger.debug(
            {
              source: source.fullName,
              target: target.fullName,
              rule: rule.name,
              type: rule.relationshipType,
            },
            'Found candidate relationship',
          )
        }
      }
    }
  }

  // Deduplicate - keep highest confidence for each pair
  const deduped = deduplicateCandidates(candidates)

  logger.info(
    { totalCandidates: candidates.length, dedupedCandidates: deduped.length },
    'Candidate matching complete',
  )

  return deduped
}

/**
 * Find which capabilities matched between repos
 */
function findMatchedCapabilities(
  source: RepoProfile,
  target: RepoProfile,
  relationshipType: RelationshipType,
): string[] {
  const matches: string[] = []

  if (relationshipType === 'can_analyze') {
    if (source.capabilities.includes('analyzes')) {
      matches.push(`${source.name} can analyze`)
    }
    if (source.capabilities.includes('detects_drift')) {
      matches.push(`${source.name} detects drift`)
    }
    if (target.roles.includes('producer')) {
      matches.push(`${target.name} produces artifacts`)
    }
  }

  if (relationshipType === 'can_validate') {
    if (source.capabilities.includes('validates')) {
      matches.push(`${source.name} validates`)
    }
  }

  if (relationshipType === 'can_orchestrate') {
    if (source.capabilities.includes('orchestrates')) {
      matches.push(`${source.name} orchestrates`)
    }
  }

  return matches
}

/**
 * Find which artifacts could be shared
 */
function findMatchedArtifacts(source: RepoProfile, target: RepoProfile): string[] {
  const matches: string[] = []

  // Source outputs that match target inputs
  for (const artifact of source.artifacts.produces) {
    if (target.artifacts.consumes.includes(artifact)) {
      matches.push(`${source.name} produces ${artifact} → ${target.name} consumes ${artifact}`)
    }
  }

  // Analyzable artifacts
  for (const artifact of target.artifacts.produces) {
    if (['components', 'tools', 'schemas', 'templates'].includes(artifact)) {
      if (
        source.capabilities.includes('analyzes') ||
        source.capabilities.includes('detects_drift')
      ) {
        matches.push(`${target.name} produces ${artifact} (analyzable by ${source.name})`)
      }
    }
  }

  return matches
}

/**
 * Calculate initial confidence based on rule match strength
 */
function calculateInitialConfidence(
  source: RepoProfile,
  target: RepoProfile,
  rule: (typeof RELATIONSHIP_RULES)[number],
): number {
  let confidence = 0.5 // Base confidence

  // Boost for high-confidence profiles
  confidence += (source.confidence + target.confidence) * 0.1

  // Boost for shared domains
  const sharedDomains = source.domains.filter((d) => target.domains.includes(d))
  confidence += sharedDomains.length * 0.05

  // Boost for complementary roles
  if (source.roles.includes('analyzer') && target.roles.includes('producer')) {
    confidence += 0.15
  }

  // Boost for specific high-value rules
  if (rule.name === 'drift_detector_to_patterns') {
    confidence += 0.1
  }

  return Math.min(confidence, 0.95)
}

/**
 * Deduplicate candidates, keeping highest confidence per pair
 */
function deduplicateCandidates(candidates: RelationshipCandidate[]): RelationshipCandidate[] {
  const byPair = new Map<string, RelationshipCandidate>()

  for (const candidate of candidates) {
    const key = `${candidate.sourceRepo.repoId}:${candidate.targetRepo.repoId}`
    const existing = byPair.get(key)

    if (!existing || candidate.confidence > existing.confidence) {
      byPair.set(key, candidate)
    }
  }

  return Array.from(byPair.values())
}

/**
 * Assess a candidate relationship using LLM
 */
export async function assessRelationship(
  candidate: RelationshipCandidate,
): Promise<RelationshipAssessment | null> {
  const prompt = buildAssessmentPrompt(candidate)

  try {
    const { object: assessment } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: RelationshipAssessmentSchema,
      system: `You are an expert software architect evaluating potential integration opportunities between repositories.

Your job is to determine if a proposed relationship represents a REAL, ACTIONABLE integration opportunity.

A good integration opportunity:
- Provides concrete value if implemented
- Is specific enough to act on
- Is not obvious/already done
- Makes sense given both repos' purposes

A bad integration opportunity:
- Is too vague ("both use JavaScript")
- Is already implemented
- Doesn't provide clear value
- Misunderstands what the repos do

Be critical. Most candidates should NOT pass.
Only approve opportunities that would genuinely help a developer.`,
      prompt,
    })

    logger.debug(
      {
        source: candidate.sourceRepo.fullName,
        target: candidate.targetRepo.fullName,
        isValid: assessment.isValidOpportunity,
        confidence: assessment.confidence,
      },
      'Relationship assessed',
    )

    return assessment
  } catch (error) {
    logger.error({ error, candidate: candidate.hypothesis }, 'Failed to assess relationship')
    return null
  }
}

/**
 * Build prompt for relationship assessment
 */
function buildAssessmentPrompt(candidate: RelationshipCandidate): string {
  const {
    sourceRepo,
    targetRepo,
    relationshipType,
    hypothesis,
    matchedCapabilities,
    matchedArtifacts,
  } = candidate

  return `Evaluate this potential integration opportunity:

## Source Repository: ${sourceRepo.fullName}
**Purpose**: ${sourceRepo.purpose}
**Capabilities**: ${sourceRepo.capabilities.join(', ')}
**Produces**: ${sourceRepo.artifacts.produces.join(', ')}
**Domains**: ${sourceRepo.domains.join(', ')}
**Roles**: ${sourceRepo.roles.join(', ')}
**README excerpt**: ${sourceRepo.readmeExcerpt.slice(0, 500)}

## Target Repository: ${targetRepo.fullName}
**Purpose**: ${targetRepo.purpose}
**Capabilities**: ${targetRepo.capabilities.join(', ')}
**Produces**: ${targetRepo.artifacts.produces.join(', ')}
**Consumes**: ${targetRepo.artifacts.consumes.join(', ')}
**Domains**: ${targetRepo.domains.join(', ')}
**Roles**: ${targetRepo.roles.join(', ')}
**README excerpt**: ${targetRepo.readmeExcerpt.slice(0, 500)}

## Proposed Relationship
**Type**: ${relationshipType}
**Hypothesis**: ${hypothesis}
**Matched Capabilities**: ${matchedCapabilities.join('; ') || 'None specific'}
**Matched Artifacts**: ${matchedArtifacts.join('; ') || 'None specific'}

---

Is this a real, actionable integration opportunity?
If yes, provide a specific, concrete suggestion for how to integrate these repos.
If no, explain why this isn't a valuable opportunity.`
}

/**
 * Full assessment pipeline: find candidates and assess them
 */
export async function findAndAssessRelationships(
  profiles: RepoProfile[],
  options: { maxCandidates?: number; minConfidence?: number } = {},
): Promise<Array<{ candidate: RelationshipCandidate; assessment: RelationshipAssessment }>> {
  const { maxCandidates = 20, minConfidence = 0.6 } = options

  // Find candidates using rules
  const candidates = findCandidateRelationships(profiles)

  // Sort by confidence and take top N
  const topCandidates = candidates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxCandidates)

  logger.info(
    { totalCandidates: candidates.length, assessing: topCandidates.length },
    'Assessing top candidates',
  )

  // Assess each candidate
  const results: Array<{ candidate: RelationshipCandidate; assessment: RelationshipAssessment }> =
    []

  for (const candidate of topCandidates) {
    const assessment = await assessRelationship(candidate)

    if (assessment && assessment.isValidOpportunity && assessment.confidence >= minConfidence) {
      results.push({ candidate, assessment })
    }
  }

  logger.info(
    { assessed: topCandidates.length, validated: results.length },
    'Relationship assessment complete',
  )

  return results
}
