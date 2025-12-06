/**
 * Philosophical Profiling & Schizosophy Matching
 *
 * Detects philosophical alignment between repositories that operate in the same
 * conceptual space, even when their code and function are completely different.
 *
 * This layer finds connections embeddings will never detect - repos that share:
 * - Epistemological stance (how they seek truth)
 * - Conceptual enemies (what they fight against)
 * - Cognitive transforms (what they do to understanding)
 *
 * @see docs/PRAGMATIC-SEMANTIC-SPACE.md for the philosophical background
 */

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { logger } from '@symploke/logger'
import type { RepoProfile } from './ontology'

// ============================================================================
// PHILOSOPHICAL ONTOLOGY
// ============================================================================

/**
 * How the repository approaches truth-seeking
 */
export const EPISTEMOLOGIES = [
  'empirical', // Measures, profiles, observes reality
  'formal', // Proves, types, validates against rules
  'pragmatic', // Does what works, focuses on outcomes
  'constructive', // Builds, generates, creates new things
] as const

export type Epistemology = (typeof EPISTEMOLOGIES)[number]

/**
 * What conceptual enemy the repository fights
 */
export const ANTAGONISTS = [
  'complexity', // Fights accidental complexity, bloat, over-engineering
  'inconsistency', // Fights drift, divergence, pattern violations
  'ambiguity', // Fights unclear contracts, missing types, vague specs
  'rigidity', // Fights inflexibility, coupling, hard-coded assumptions
  'entropy', // Fights general software decay and disorder
] as const

export type Antagonist = (typeof ANTAGONISTS)[number]

/**
 * What transformation the repository performs on understanding
 */
export const COGNITIVE_TRANSFORMS = [
  'reveals', // Makes hidden things visible (analyzers, profilers)
  'enforces', // Ensures rules are followed (validators, linters)
  'generates', // Creates new artifacts (generators, scaffolders)
  'validates', // Checks correctness (testers, type checkers)
  'measures', // Quantifies properties (metrics, benchmarks)
] as const

export type CognitiveTransform = (typeof COGNITIVE_TRANSFORMS)[number]

/**
 * Temporal orientation - when does the repo act?
 */
export const TEMPORALITIES = [
  'prevents', // Acts before problems occur (design, planning)
  'detects', // Finds existing problems (analysis, monitoring)
  'corrects', // Fixes found problems (refactoring, migration)
  'documents', // Records for future reference (docs, logs)
] as const

export type Temporality = (typeof TEMPORALITIES)[number]

/**
 * Level of abstraction the repository operates at
 */
export const ABSTRACTION_LEVELS = [
  'data', // Raw data transformations
  'pattern', // Code patterns and conventions
  'architecture', // System design and structure
  'philosophy', // Meta-level principles and approaches
] as const

export type AbstractionLevel = (typeof ABSTRACTION_LEVELS)[number]

// ============================================================================
// PHILOSOPHICAL PROFILE
// ============================================================================

/**
 * A repository's philosophical stance
 */
export interface PhilosophicalProfile {
  repoId: string

  // Core philosophical dimensions
  epistemology: Epistemology
  antagonist: Antagonist
  cognitiveTransform: CognitiveTransform
  temporality: Temporality
  abstractionLevel: AbstractionLevel

  // Human-readable philosophy statement
  philosophyStatement: string

  // What virtue does this code embody?
  coreVirtue: string

  // Confidence in extraction
  confidence: number
}

// ============================================================================
// EXTRACTION SCHEMA
// ============================================================================

const PhilosophicalProfileSchema = z.object({
  epistemology: z.enum(EPISTEMOLOGIES).describe('How does this repository approach truth-seeking?'),
  antagonist: z.enum(ANTAGONISTS).describe('What conceptual enemy does this repository fight?'),
  cognitiveTransform: z
    .enum(COGNITIVE_TRANSFORMS)
    .describe('What transformation does this repository perform on understanding?'),
  temporality: z
    .enum(TEMPORALITIES)
    .describe('When does this repository act in the problem space?'),
  abstractionLevel: z
    .enum(ABSTRACTION_LEVELS)
    .describe('What level of abstraction does this repository operate at?'),
  philosophyStatement: z
    .string()
    .describe(
      'One sentence capturing the philosophical stance (e.g., "Honest code does exactly what\'s needed and acknowledges drift from its purpose")',
    ),
  coreVirtue: z
    .string()
    .describe(
      'The primary virtue this code embodies (e.g., "honesty", "consistency", "clarity", "simplicity")',
    ),
  confidence: z.number().min(0).max(1).describe('Confidence in this philosophical analysis (0-1)'),
})

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Extract philosophical profile from a repo profile
 *
 * This runs AFTER the functional profile is extracted, using the same
 * source data but asking different questions.
 */
export async function extractPhilosophicalProfile(
  repoProfile: RepoProfile,
): Promise<PhilosophicalProfile | null> {
  logger.info(
    { repoId: repoProfile.repoId, fullName: repoProfile.fullName },
    'Extracting philosophical profile',
  )

  try {
    const { object: extracted } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: PhilosophicalProfileSchema,
      system: PHILOSOPHICAL_EXTRACTION_SYSTEM_PROMPT,
      prompt: buildPhilosophicalPrompt(repoProfile),
    })

    const profile: PhilosophicalProfile = {
      repoId: repoProfile.repoId,
      epistemology: extracted.epistemology,
      antagonist: extracted.antagonist,
      cognitiveTransform: extracted.cognitiveTransform,
      temporality: extracted.temporality,
      abstractionLevel: extracted.abstractionLevel,
      philosophyStatement: extracted.philosophyStatement,
      coreVirtue: extracted.coreVirtue,
      confidence: extracted.confidence,
    }

    logger.info(
      {
        repoId: repoProfile.repoId,
        fullName: repoProfile.fullName,
        epistemology: profile.epistemology,
        antagonist: profile.antagonist,
        cognitiveTransform: profile.cognitiveTransform,
        confidence: profile.confidence,
      },
      'Philosophical profile extracted',
    )

    return profile
  } catch (error) {
    logger.error({ error, repoId: repoProfile.repoId }, 'Failed to extract philosophical profile')
    return null
  }
}

const PHILOSOPHICAL_EXTRACTION_SYSTEM_PROMPT = `You are a philosopher of software analyzing the conceptual stance of repositories.

Beyond what a repository DOES, consider what it BELIEVES:

1. What does this code assume about the nature of software?
   - Is software inherently entropic? Perfectible? Messy? Ideally simple?

2. What does this code assume about developers?
   - Need guardrails? Can be trusted? Are fallible? Are experts?

3. What gap does this code address?
   - Ideal vs actual? Intention vs implementation? Known vs unknown?

4. What virtue does this code embody?
   - Honesty? Consistency? Clarity? Completeness? Simplicity?

5. What enemy does this code fight?
   - Entropy? Ambiguity? Complexity? Inconsistency? Rigidity?

CRITICAL: Use ONLY the provided enum values for each dimension.
- Epistemology: empirical, formal, pragmatic, constructive
- Antagonist: complexity, inconsistency, ambiguity, rigidity, entropy
- Cognitive Transform: reveals, enforces, generates, validates, measures
- Temporality: prevents, detects, corrects, documents
- Abstraction Level: data, pattern, architecture, philosophy

Be specific. Think deeply about the WORLDVIEW this code embodies.
If information is limited, make reasonable inferences but lower confidence.`

function buildPhilosophicalPrompt(profile: RepoProfile): string {
  return `Analyze the philosophical stance of this repository:

## Repository: ${profile.fullName}

**Purpose**: ${profile.purpose}

**Capabilities**: ${profile.capabilities.join(', ')}
**Produces**: ${profile.artifacts.produces.join(', ')}
**Consumes**: ${profile.artifacts.consumes.join(', ')}
**Domains**: ${profile.domains.join(', ')}
**Roles**: ${profile.roles.join(', ')}

**Problems Solved**: ${profile.problemsSolved.join('; ')}
**Target Users**: ${profile.targetUsers.join(', ')}

**README Excerpt**:
${profile.readmeExcerpt}

**Package Description**: ${profile.packageDescription}

---

Beyond the functional analysis above, what is the PHILOSOPHICAL STANCE of this repository?

- What does it believe about software?
- What enemy does it fight?
- What virtue does it embody?
- At what level does it operate?

Remember the philosophical ontology:
- Epistemology: ${EPISTEMOLOGIES.join(', ')}
- Antagonist: ${ANTAGONISTS.join(', ')}
- Cognitive Transform: ${COGNITIVE_TRANSFORMS.join(', ')}
- Temporality: ${TEMPORALITIES.join(', ')}
- Abstraction Level: ${ABSTRACTION_LEVELS.join(', ')}`
}

// ============================================================================
// SCHIZOSOPHY MATCHING
// ============================================================================

/**
 * Anti-entropy antagonists - all fight software decay in different ways
 */
const ANTI_ENTROPY_ANTAGONISTS: Antagonist[] = ['complexity', 'inconsistency', 'entropy']

/**
 * A philosophical match between two repositories
 */
export interface PhilosophicalMatch {
  sourceProfile: PhilosophicalProfile
  targetProfile: PhilosophicalProfile
  matchType: PhilosophicalMatchType
  description: string
  confidence: number
  integrationHypothesis: string
}

export type PhilosophicalMatchType =
  | 'shared_antagonist'
  | 'vertical_alignment'
  | 'epistemological_kin'
  | 'reveal_enforce_pair'
  | 'anti_entropy_alignment'

/**
 * Schizosophy matching rules
 *
 * These detect philosophical alignment that embeddings cannot find.
 */
export const SCHIZOSOPHY_RULES: Array<{
  name: PhilosophicalMatchType
  description: string
  match: (source: PhilosophicalProfile, target: PhilosophicalProfile) => boolean
  confidence: number
  hypothesis: (source: PhilosophicalProfile, target: PhilosophicalProfile) => string
}> = [
  {
    name: 'shared_antagonist',
    description: 'Both repos fight the same conceptual enemy',
    match: (source, target) => source.antagonist === target.antagonist,
    confidence: 0.7,
    hypothesis: (source, _target) =>
      `Both fight ${source.antagonist}. They could share strategies or become complementary tools.`,
  },
  {
    name: 'vertical_alignment',
    description: 'They fight the same enemy but at different abstraction levels',
    match: (source, target) =>
      source.antagonist === target.antagonist &&
      source.abstractionLevel !== target.abstractionLevel,
    confidence: 0.8,
    hypothesis: (source, target) =>
      `Both fight ${source.antagonist} but at different scales: ` +
      `${source.abstractionLevel}-level vs ${target.abstractionLevel}-level. ` +
      `Together they form a multi-scale defense.`,
  },
  {
    name: 'epistemological_kin',
    description: 'Both repos use the same approach to truth-seeking',
    match: (source, target) => source.epistemology === target.epistemology,
    confidence: 0.6,
    hypothesis: (source, _target) =>
      `Both embody ${source.epistemology} epistemology. ` +
      `Developers who value one would appreciate the other.`,
  },
  {
    name: 'reveal_enforce_pair',
    description: 'One reveals drift; the other enforces correction',
    match: (source, target) =>
      (source.cognitiveTransform === 'reveals' && target.cognitiveTransform === 'enforces') ||
      (source.cognitiveTransform === 'enforces' && target.cognitiveTransform === 'reveals'),
    confidence: 0.75,
    hypothesis: (source, _target) => {
      const revealer = source.cognitiveTransform === 'reveals' ? 'Source' : 'Target'
      const enforcer = revealer === 'Source' ? 'Target' : 'Source'
      return (
        `${revealer} reveals problems, ${enforcer} enforces fixes. ` +
        `Natural pairing for "detect then fix" workflows.`
      )
    },
  },
  {
    name: 'anti_entropy_alignment',
    description: 'Both repos fight software entropy in different ways',
    match: (source, target) =>
      ANTI_ENTROPY_ANTAGONISTS.includes(source.antagonist) &&
      ANTI_ENTROPY_ANTAGONISTS.includes(target.antagonist) &&
      source.antagonist !== target.antagonist,
    confidence: 0.65,
    hypothesis: (source, target) =>
      `Both fight software entropy: source targets ${source.antagonist}, ` +
      `target targets ${target.antagonist}. ` +
      `Together they form a comprehensive anti-entropy strategy.`,
  },
]

/**
 * Find philosophical matches between profiles
 */
export function findPhilosophicalMatches(profiles: PhilosophicalProfile[]): PhilosophicalMatch[] {
  const matches: PhilosophicalMatch[] = []

  for (let i = 0; i < profiles.length; i++) {
    for (let j = 0; j < profiles.length; j++) {
      if (i === j) continue

      const source = profiles[i]!
      const target = profiles[j]!

      for (const rule of SCHIZOSOPHY_RULES) {
        if (rule.match(source, target)) {
          // Calculate combined confidence
          const profileConfidence = (source.confidence + target.confidence) / 2
          const finalConfidence = rule.confidence * profileConfidence

          matches.push({
            sourceProfile: source,
            targetProfile: target,
            matchType: rule.name,
            description: rule.description,
            confidence: finalConfidence,
            integrationHypothesis: rule.hypothesis(source, target),
          })

          logger.debug(
            {
              source: source.repoId,
              target: target.repoId,
              matchType: rule.name,
              confidence: finalConfidence,
            },
            'Found philosophical match',
          )
        }
      }
    }
  }

  // Deduplicate - keep highest confidence per pair
  const deduped = deduplicatePhilosophicalMatches(matches)

  logger.info(
    { totalMatches: matches.length, dedupedMatches: deduped.length },
    'Philosophical matching complete',
  )

  return deduped
}

/**
 * Deduplicate matches, keeping highest confidence per pair
 */
function deduplicatePhilosophicalMatches(matches: PhilosophicalMatch[]): PhilosophicalMatch[] {
  const byPair = new Map<string, PhilosophicalMatch>()

  for (const match of matches) {
    const key = `${match.sourceProfile.repoId}:${match.targetProfile.repoId}`
    const existing = byPair.get(key)

    if (!existing || match.confidence > existing.confidence) {
      byPair.set(key, match)
    }
  }

  return Array.from(byPair.values())
}

// ============================================================================
// INTEGRATION OPPORTUNITY TEMPLATES
// ============================================================================

/**
 * Generate detailed integration opportunity text for a philosophical match
 */
export function generatePhilosophicalIntegration(
  match: PhilosophicalMatch,
  sourceFullName: string,
  targetFullName: string,
): string {
  const { sourceProfile, targetProfile, matchType } = match

  switch (matchType) {
    case 'vertical_alignment':
      return `## Vertical Alignment Opportunity

**${sourceFullName}** addresses ${sourceProfile.antagonist} at the **${sourceProfile.abstractionLevel}** level.
**${targetFullName}** addresses ${targetProfile.antagonist} at the **${targetProfile.abstractionLevel}** level.

Together they can form a multi-scale anti-${sourceProfile.antagonist} system.

**Possible Integrations:**
- Feed ${targetFullName}'s ${targetProfile.abstractionLevel}-level insights into ${sourceFullName}'s ${sourceProfile.abstractionLevel}-level checks
- ${sourceFullName} defines the philosophy; ${targetFullName} detects deviations from it
- Create a unified dashboard showing ${sourceProfile.antagonist} at all abstraction levels`

    case 'anti_entropy_alignment':
      return `## Anti-Entropy Alignment Opportunity

Both repos fight software entropy:
- **${sourceFullName}**: fights **${sourceProfile.antagonist}** (${sourceProfile.philosophyStatement})
- **${targetFullName}**: fights **${targetProfile.antagonist}** (${targetProfile.philosophyStatement})

**Combined Strategy:**
- Create a holistic "entropy dashboard" showing:
  - ${sourceProfile.antagonist} indicators from ${sourceFullName}
  - ${targetProfile.antagonist} indicators from ${targetFullName}
  - Deviation history over time
  - Suggested simplifications

**Philosophy:** ${sourceProfile.coreVirtue} + ${targetProfile.coreVirtue} = comprehensive anti-entropy`

    case 'reveal_enforce_pair':
      return `## Reveal-Enforce Pair Opportunity

Natural workflow pairing:
- **Revealer**: ${sourceProfile.cognitiveTransform === 'reveals' ? sourceFullName : targetFullName}
- **Enforcer**: ${sourceProfile.cognitiveTransform === 'enforces' ? sourceFullName : targetFullName}

**Workflow:**
1. Revealer identifies problems (drift, violations, debt)
2. Enforcer automatically fixes or prevents recurrence
3. Feedback loop improves both systems

**Integration:** Connect the revealer's output format to the enforcer's input format.`

    case 'epistemological_kin':
      return `## Epistemological Kinship

Both repos embody **${sourceProfile.epistemology}** epistemology:
- **${sourceFullName}**: ${sourceProfile.philosophyStatement}
- **${targetFullName}**: ${targetProfile.philosophyStatement}

**Value:** Developers who appreciate one will naturally appreciate the other.
Cross-pollinate ideas, patterns, and approaches between the two communities.`

    default:
      return `## Shared Antagonist: ${sourceProfile.antagonist}

Both repos fight **${sourceProfile.antagonist}**:
- **${sourceFullName}** (${sourceProfile.cognitiveTransform}s at ${sourceProfile.abstractionLevel} level)
- **${targetFullName}** (${targetProfile.cognitiveTransform}s at ${targetProfile.abstractionLevel} level)

**Opportunity:** Share strategies, combine forces, or create a unified anti-${sourceProfile.antagonist} toolkit.`
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Extract philosophical profiles for all repos in a collection
 */
export async function extractPhilosophicalProfiles(
  repoProfiles: RepoProfile[],
): Promise<PhilosophicalProfile[]> {
  const profiles: PhilosophicalProfile[] = []

  for (const repoProfile of repoProfiles) {
    const philProfile = await extractPhilosophicalProfile(repoProfile)
    if (philProfile) {
      profiles.push(philProfile)
    }
  }

  logger.info(
    { extracted: profiles.length, total: repoProfiles.length },
    'Philosophical profile extraction complete',
  )

  return profiles
}
