import { db, WeaveType as PrismaWeaveType, GlossaryStatus } from '@symploke/db'
import { logger } from '@symploke/logger'
import type {
  WeaveCandidate,
  WeaveOptions,
  WeaveTypeHandler,
  FilePairMatch,
  GlossaryAlignmentMetadata,
} from './base.js'
import type {
  RepoGlossaryData,
  GlossaryTerm,
  GlossaryResentments,
  GlossaryPhilosophy,
  GlossaryPoetics,
  GlossaryPsychology,
} from '../glossary.js'

/**
 * Glossary Alignment WeaveType
 *
 * Discovers connections between repositories through their glossaries -
 * shared vocabulary, aligned resentments, complementary beliefs, and poetic resonance.
 *
 * This is the soul-to-soul matching that embeddings cannot find.
 */
export const GlossaryAlignmentWeave: WeaveTypeHandler = {
  id: PrismaWeaveType.glossary_alignment,
  name: 'Glossary Alignment',
  description:
    'Discovers repositories with aligned vocabulary, beliefs, resentments, and aesthetic sensibilities',

  async findWeaves(
    plexusId: string,
    sourceRepoId: string,
    targetRepoId: string,
    _options: WeaveOptions = {},
  ): Promise<WeaveCandidate[]> {
    logger.info({ plexusId, sourceRepoId, targetRepoId }, 'Finding glossary alignments')

    // Get both repos
    const [sourceRepo, targetRepo] = await Promise.all([
      db.repo.findUnique({ where: { id: sourceRepoId } }),
      db.repo.findUnique({ where: { id: targetRepoId } }),
    ])

    if (!sourceRepo || !targetRepo) {
      logger.warn({ sourceRepoId, targetRepoId }, 'One or both repos not found')
      return []
    }

    // Get glossaries
    const [sourceGlossaryRecord, targetGlossaryRecord] = await Promise.all([
      db.repoGlossary.findUnique({ where: { repoId: sourceRepoId } }),
      db.repoGlossary.findUnique({ where: { repoId: targetRepoId } }),
    ])

    // Check if both have complete glossaries
    if (
      !sourceGlossaryRecord ||
      sourceGlossaryRecord.status !== GlossaryStatus.COMPLETE ||
      !targetGlossaryRecord ||
      targetGlossaryRecord.status !== GlossaryStatus.COMPLETE
    ) {
      logger.debug(
        {
          sourceRepoId,
          targetRepoId,
          sourceStatus: sourceGlossaryRecord?.status,
          targetStatus: targetGlossaryRecord?.status,
        },
        'One or both repos missing complete glossary',
      )
      return []
    }

    // Parse glossaries from JSON
    const sourceGlossary = parseGlossary(sourceGlossaryRecord)
    const targetGlossary = parseGlossary(targetGlossaryRecord)

    if (!sourceGlossary || !targetGlossary) {
      logger.warn({ sourceRepoId, targetRepoId }, 'Failed to parse glossaries')
      return []
    }

    // Calculate alignment scores
    const vocabularyScore = calculateVocabularyAlignment(sourceGlossary.terms, targetGlossary.terms)
    const resentmentScore = calculateResentmentAlignment(
      sourceGlossary.resentments,
      targetGlossary.resentments,
    )
    const philosophyScore = calculatePhilosophyAlignment(
      sourceGlossary.philosophy,
      targetGlossary.philosophy,
    )
    const poeticsScore = calculatePoeticsAlignment(sourceGlossary.poetics, targetGlossary.poetics)
    const psychologyScore = calculatePsychologyAlignment(
      sourceGlossary.psychology,
      targetGlossary.psychology,
    )

    // Weighted final score
    const finalScore =
      vocabularyScore.score * 0.3 +
      resentmentScore.score * 0.25 +
      philosophyScore.score * 0.2 +
      poeticsScore.score * 0.15 +
      psychologyScore.score * 0.1

    logger.info(
      {
        sourceRepoId,
        targetRepoId,
        vocabularyScore: vocabularyScore.score,
        resentmentScore: resentmentScore.score,
        philosophyScore: philosophyScore.score,
        poeticsScore: poeticsScore.score,
        psychologyScore: psychologyScore.score,
        finalScore,
      },
      'Glossary alignment scores calculated',
    )

    // Threshold check
    const threshold = 0.25 // Lower threshold to capture more nuanced connections
    if (finalScore < threshold) {
      logger.debug(
        { sourceRepoId, targetRepoId, finalScore, threshold },
        'Below glossary threshold',
      )
      return []
    }

    // Build description
    const alignments: string[] = []
    if (vocabularyScore.sharedTerms.length > 0) {
      alignments.push(`Shared vocabulary: ${vocabularyScore.sharedTerms.slice(0, 5).join(', ')}`)
    }
    if (resentmentScore.sharedEnemies.length > 0) {
      alignments.push(`Shared enemies: ${resentmentScore.sharedEnemies.slice(0, 3).join(', ')}`)
    }
    if (philosophyScore.sharedVirtues.length > 0) {
      alignments.push(`Shared virtues: ${philosophyScore.sharedVirtues.slice(0, 3).join(', ')}`)
    }
    if (poeticsScore.similarVoice) {
      alignments.push(`Similar voice: ${poeticsScore.similarVoice}`)
    }

    const title = generateTitle(sourceRepo.name, targetRepo.name, vocabularyScore, resentmentScore)
    const description = `${alignments.join('. ')}.`

    // Create synthetic file pairs for metadata compatibility
    const filePairs: FilePairMatch[] = [
      {
        sourceFile: 'glossary',
        targetFile: 'glossary',
        avgSimilarity: finalScore,
        maxSimilarity: finalScore,
        chunkCount: 1,
        matches: [],
      },
    ]

    // Build metadata with all alignment details for debugging UI
    const metadata: GlossaryAlignmentMetadata = {
      alignmentScores: {
        vocabulary: vocabularyScore.score,
        resentment: resentmentScore.score,
        philosophy: philosophyScore.score,
        poetics: poeticsScore.score,
        psychology: psychologyScore.score,
        final: finalScore,
      },
      sharedTerms: vocabularyScore.sharedTerms,
      sharedEnemies: resentmentScore.sharedEnemies,
      sharedVirtues: philosophyScore.sharedVirtues,
      sharedMetaphors: poeticsScore.sharedMetaphors,
      sourceGlossaryId: sourceGlossaryRecord.id,
      targetGlossaryId: targetGlossaryRecord.id,
    }

    const candidate: WeaveCandidate = {
      sourceRepoId,
      targetRepoId,
      type: PrismaWeaveType.glossary_alignment,
      score: finalScore,
      title,
      description,
      filePairs,
      metadata: metadata as unknown as Record<string, unknown>,
    }

    return [candidate]
  },
}

// ============================================================================
// ALIGNMENT CALCULATIONS
// ============================================================================

interface VocabularyAlignmentResult {
  score: number
  sharedTerms: string[]
  uniqueToSource: string[]
  uniqueToTarget: string[]
}

function calculateVocabularyAlignment(
  sourceTerms: GlossaryTerm[],
  targetTerms: GlossaryTerm[],
): VocabularyAlignmentResult {
  const sourceTermSet = new Set(sourceTerms.map((t) => t.term.toLowerCase()))
  const targetTermSet = new Set(targetTerms.map((t) => t.term.toLowerCase()))

  const sharedTerms: string[] = []
  for (const term of sourceTermSet) {
    if (targetTermSet.has(term)) {
      sharedTerms.push(term)
    }
  }

  const uniqueToSource = [...sourceTermSet].filter((t) => !targetTermSet.has(t))
  const uniqueToTarget = [...targetTermSet].filter((t) => !sourceTermSet.has(t))

  // Jaccard-like similarity
  const totalUnique = sourceTermSet.size + targetTermSet.size - sharedTerms.length
  const score = totalUnique > 0 ? sharedTerms.length / totalUnique : 0

  // Also check for semantic similarity in definitions
  let semanticBonus = 0
  for (const sourceTerm of sourceTerms) {
    for (const targetTerm of targetTerms) {
      if (sourceTerm.emotionalValence === targetTerm.emotionalValence) {
        semanticBonus += 0.02
      }
    }
  }

  return {
    score: Math.min(1, score + semanticBonus),
    sharedTerms,
    uniqueToSource,
    uniqueToTarget,
  }
}

interface ResentmentAlignmentResult {
  score: number
  sharedEnemies: string[]
  sharedHates: string[]
}

function calculateResentmentAlignment(
  source: GlossaryResentments,
  target: GlossaryResentments,
): ResentmentAlignmentResult {
  // Compare enemies
  const sourceEnemies = new Set([
    ...source.enemies.map((e) => e.toLowerCase()),
    ...source.definesAgainst.map((d) => d.toLowerCase()),
  ])
  const targetEnemies = new Set([
    ...target.enemies.map((e) => e.toLowerCase()),
    ...target.definesAgainst.map((d) => d.toLowerCase()),
  ])

  const sharedEnemies: string[] = []
  for (const enemy of sourceEnemies) {
    if (targetEnemies.has(enemy)) {
      sharedEnemies.push(enemy)
    }
  }

  // Compare hates
  const sourceHates = new Set(source.hates.map((h) => h.toLowerCase()))
  const targetHates = new Set(target.hates.map((h) => h.toLowerCase()))

  const sharedHates: string[] = []
  for (const hate of sourceHates) {
    if (targetHates.has(hate)) {
      sharedHates.push(hate)
    }
  }

  // Score based on shared enemies and hates
  const enemyScore = sharedEnemies.length > 0 ? Math.min(1, sharedEnemies.length * 0.3) : 0
  const hateScore = sharedHates.length > 0 ? Math.min(1, sharedHates.length * 0.2) : 0

  return {
    score: Math.min(1, enemyScore + hateScore),
    sharedEnemies,
    sharedHates,
  }
}

interface PhilosophyAlignmentResult {
  score: number
  sharedVirtues: string[]
  sharedBeliefs: string[]
  epistemologyMatch: boolean
}

function calculatePhilosophyAlignment(
  source: GlossaryPhilosophy,
  target: GlossaryPhilosophy,
): PhilosophyAlignmentResult {
  // Compare virtues
  const sourceVirtues = new Set(source.virtues.map((v) => v.toLowerCase()))
  const targetVirtues = new Set(target.virtues.map((v) => v.toLowerCase()))

  const sharedVirtues: string[] = []
  for (const virtue of sourceVirtues) {
    if (targetVirtues.has(virtue)) {
      sharedVirtues.push(virtue)
    }
  }

  // Compare beliefs
  const sourceBeliefs = new Set(source.beliefs.map((b) => b.toLowerCase()))
  const targetBeliefs = new Set(target.beliefs.map((b) => b.toLowerCase()))

  const sharedBeliefs: string[] = []
  for (const belief of sourceBeliefs) {
    if (targetBeliefs.has(belief)) {
      sharedBeliefs.push(belief)
    }
  }

  // Check epistemology similarity (simple keyword match)
  const epistemologyMatch =
    source.epistemology.toLowerCase().includes(target.epistemology.toLowerCase().slice(0, 20)) ||
    target.epistemology.toLowerCase().includes(source.epistemology.toLowerCase().slice(0, 20))

  const virtueScore = sharedVirtues.length > 0 ? Math.min(1, sharedVirtues.length * 0.25) : 0
  const beliefScore = sharedBeliefs.length > 0 ? Math.min(1, sharedBeliefs.length * 0.15) : 0
  const epistemologyScore = epistemologyMatch ? 0.3 : 0

  return {
    score: Math.min(1, virtueScore + beliefScore + epistemologyScore),
    sharedVirtues,
    sharedBeliefs,
    epistemologyMatch,
  }
}

interface PoeticsAlignmentResult {
  score: number
  sharedMetaphors: string[]
  similarVoice: string | null
}

function calculatePoeticsAlignment(
  source: GlossaryPoetics,
  target: GlossaryPoetics,
): PoeticsAlignmentResult {
  // Compare metaphors
  const sourceMetaphors = new Set(source.metaphors.map((m) => m.toLowerCase()))
  const targetMetaphors = new Set(target.metaphors.map((m) => m.toLowerCase()))

  const sharedMetaphors: string[] = []
  for (const metaphor of sourceMetaphors) {
    if (targetMetaphors.has(metaphor)) {
      sharedMetaphors.push(metaphor)
    }
  }

  // Check voice similarity
  const voiceMatch =
    source.voice.toLowerCase().includes(target.voice.toLowerCase().slice(0, 10)) ||
    target.voice.toLowerCase().includes(source.voice.toLowerCase().slice(0, 10))

  // Check aesthetic similarity
  const aestheticMatch =
    source.aesthetic.toLowerCase().includes(target.aesthetic.toLowerCase().slice(0, 15)) ||
    target.aesthetic.toLowerCase().includes(source.aesthetic.toLowerCase().slice(0, 15))

  const metaphorScore = sharedMetaphors.length > 0 ? Math.min(1, sharedMetaphors.length * 0.3) : 0
  const voiceScore = voiceMatch ? 0.4 : 0
  const aestheticScore = aestheticMatch ? 0.3 : 0

  return {
    score: Math.min(1, metaphorScore + voiceScore + aestheticScore),
    sharedMetaphors,
    similarVoice: voiceMatch ? source.voice : null,
  }
}

interface PsychologyAlignmentResult {
  score: number
  compatibleFears: boolean
  complementaryConfidences: boolean
}

function calculatePsychologyAlignment(
  source: GlossaryPsychology,
  target: GlossaryPsychology,
): PsychologyAlignmentResult {
  // Check if fears don't conflict (both fear the same things = alignment)
  const sourceFears = new Set(source.fears.map((f) => f.toLowerCase()))
  const targetFears = new Set(target.fears.map((f) => f.toLowerCase()))

  let sharedFears = 0
  for (const fear of sourceFears) {
    if (targetFears.has(fear)) {
      sharedFears++
    }
  }

  // Check if confidences complement (one is confident where other is uncertain)
  const sourceConfidences = new Set(source.confidences.map((c) => c.toLowerCase()))
  const targetConfidences = new Set(target.confidences.map((c) => c.toLowerCase()))

  let complementaryConfidences = 0
  // If source is confident where target has blind spots, that's complementary
  for (const confidence of sourceConfidences) {
    if (target.blindSpots.some((bs) => bs.toLowerCase().includes(confidence.slice(0, 10)))) {
      complementaryConfidences++
    }
  }
  for (const confidence of targetConfidences) {
    if (source.blindSpots.some((bs) => bs.toLowerCase().includes(confidence.slice(0, 10)))) {
      complementaryConfidences++
    }
  }

  const fearScore = sharedFears > 0 ? Math.min(1, sharedFears * 0.3) : 0
  const complementScore =
    complementaryConfidences > 0 ? Math.min(1, complementaryConfidences * 0.4) : 0

  return {
    score: Math.min(1, fearScore + complementScore),
    compatibleFears: sharedFears > 0,
    complementaryConfidences: complementaryConfidences > 0,
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function parseGlossary(record: {
  terms: unknown
  empirics: unknown
  psychology: unknown
  poetics: unknown
  philosophy: unknown
  resentments: unknown
  futureVision: string | null
  confidence: number | null
}): RepoGlossaryData | null {
  try {
    return {
      terms: record.terms as GlossaryTerm[],
      empirics: record.empirics as RepoGlossaryData['empirics'],
      psychology: record.psychology as GlossaryPsychology,
      poetics: record.poetics as GlossaryPoetics,
      philosophy: record.philosophy as GlossaryPhilosophy,
      resentments: record.resentments as GlossaryResentments,
      futureVision: record.futureVision || '',
      confidence: record.confidence || 0,
    }
  } catch {
    return null
  }
}

function generateTitle(
  sourceName: string,
  targetName: string,
  vocabularyResult: VocabularyAlignmentResult,
  resentmentResult: ResentmentAlignmentResult,
): string {
  if (resentmentResult.sharedEnemies.length > 0) {
    return `${sourceName} & ${targetName}: United against ${resentmentResult.sharedEnemies[0]}`
  }
  if (vocabularyResult.sharedTerms.length > 0) {
    return `${sourceName} & ${targetName}: Shared language of ${vocabularyResult.sharedTerms[0]}`
  }
  return `${sourceName} & ${targetName}: Kindred spirits`
}
