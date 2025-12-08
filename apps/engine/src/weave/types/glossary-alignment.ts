import { openai } from '@ai-sdk/openai'
import { db, GlossaryStatus, WeaveType as PrismaWeaveType } from '@symploke/db'
import { logger } from '@symploke/logger'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getGlossary, type RepoGlossaryData } from '../glossary.js'
import type {
  FilePairMatch,
  GlossaryAlignmentMetadata,
  WeaveCandidate,
  WeaveOptions,
  WeaveTypeHandler,
} from './base.js'

/**
 * Glossary Alignment WeaveType
 *
 * Uses AI to compare two repository glossaries and generate:
 * - A narrative explanation of their relationship
 * - An overall alignment score
 * - Specific synergies and tensions
 */
export const GlossaryAlignmentWeave: WeaveTypeHandler = {
  id: PrismaWeaveType.glossary_alignment,
  name: 'Glossary Alignment',
  description:
    'Discovers repositories with aligned purposes, values, and enemies using AI-powered comparison',

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
    const [sourceGlossary, targetGlossary] = await Promise.all([
      getGlossary(sourceRepoId),
      getGlossary(targetRepoId),
    ])

    // Get glossary records for IDs
    const [sourceGlossaryRecord, targetGlossaryRecord] = await Promise.all([
      db.repoGlossary.findUnique({ where: { repoId: sourceRepoId } }),
      db.repoGlossary.findUnique({ where: { repoId: targetRepoId } }),
    ])

    // Check if both have complete glossaries
    if (
      !sourceGlossary ||
      !targetGlossary ||
      !sourceGlossaryRecord ||
      sourceGlossaryRecord.status !== GlossaryStatus.COMPLETE ||
      !targetGlossaryRecord ||
      targetGlossaryRecord.status !== GlossaryStatus.COMPLETE
    ) {
      logger.debug(
        {
          sourceRepoId,
          targetRepoId,
          hasSourceGlossary: !!sourceGlossary,
          hasTargetGlossary: !!targetGlossary,
        },
        'One or both repos missing complete glossary',
      )
      return []
    }

    // Use AI to compare glossaries
    const comparison = await compareGlossariesWithAI(
      sourceRepo.fullName,
      targetRepo.fullName,
      sourceGlossary,
      targetGlossary,
    )

    if (!comparison) {
      logger.warn({ sourceRepoId, targetRepoId }, 'AI comparison failed')
      return []
    }

    logger.info(
      {
        sourceRepoId,
        targetRepoId,
        score: comparison.overallScore,
        complementary: comparison.complementary,
        competing: comparison.competing,
        synergies: comparison.synergies.length,
        tensions: comparison.tensions.length,
      },
      'Glossary AI comparison complete',
    )

    // Threshold check (25% minimum)
    const threshold = 0.25
    if (comparison.overallScore < threshold) {
      logger.debug(
        { sourceRepoId, targetRepoId, score: comparison.overallScore, threshold },
        'Below glossary threshold',
      )
      return []
    }

    // Generate title based on relationship
    const title = generateTitle(
      sourceRepo.name,
      targetRepo.name,
      comparison.complementary,
      comparison.competing,
      comparison.synergies,
    )

    // Create synthetic file pairs for metadata compatibility
    const filePairs: FilePairMatch[] = [
      {
        sourceFile: 'glossary',
        targetFile: 'glossary',
        avgSimilarity: comparison.overallScore,
        maxSimilarity: comparison.overallScore,
        chunkCount: 1,
        matches: [],
      },
    ]

    // Build metadata
    const metadata: GlossaryAlignmentMetadata = {
      narrative: comparison.narrative,
      overallScore: comparison.overallScore,
      complementary: comparison.complementary,
      competing: comparison.competing,
      synergies: comparison.synergies,
      tensions: comparison.tensions,
      sourceGlossaryId: sourceGlossaryRecord.id,
      targetGlossaryId: targetGlossaryRecord.id,
      sourceSummary: sourceGlossary.summary,
      targetSummary: targetGlossary.summary,
    }

    const candidate: WeaveCandidate = {
      sourceRepoId,
      targetRepoId,
      type: PrismaWeaveType.glossary_alignment,
      score: comparison.overallScore,
      title,
      description: comparison.narrative,
      filePairs,
      metadata: metadata as unknown as Record<string, unknown>,
    }

    return [candidate]
  },
}

// ============================================================================
// AI COMPARISON
// ============================================================================

const ComparisonResultSchema = z.object({
  narrative: z
    .string()
    .describe(
      '2-3 sentences explaining the relationship between these repositories. Be specific about what connects or separates them.',
    ),
  overallScore: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Alignment score from 0 to 1. 0 = completely unrelated, 0.5 = some overlap, 1 = nearly identical purpose/values',
    ),
  complementary: z
    .boolean()
    .describe('True if these repos complement each other (different strengths that work together)'),
  competing: z
    .boolean()
    .describe('True if these repos are in the same space (solving similar problems)'),
  synergies: z
    .array(z.string())
    .describe('Specific ways these repos could integrate or help each other (2-5 items)'),
  tensions: z
    .array(z.string())
    .describe('Potential conflicts or incompatibilities between these repos (0-3 items)'),
})

type ComparisonResult = z.infer<typeof ComparisonResultSchema>

const COMPARISON_SYSTEM_PROMPT = `You are analyzing two software repositories to find potential connections.

Your task is to compare their profiles and determine:
1. How aligned are they in purpose, values, and approach?
2. Do they complement each other or compete?
3. What specific integration opportunities exist?
4. What tensions might arise if they were used together?

Be specific and practical. Focus on:
- Shared enemies (problems they both fight against)
- Complementary features (one has what the other lacks)
- Shared values (similar beliefs about good software)
- Technical compatibility (could they actually integrate?)

Score guidelines:
- 0.0-0.2: Completely unrelated domains
- 0.2-0.4: Some philosophical overlap but different focus
- 0.4-0.6: Meaningful connection, potential for integration
- 0.6-0.8: Strong alignment, natural partners
- 0.8-1.0: Nearly identical purpose/values

Be conservative with high scores. Two repos in the same general area (e.g., both are web frameworks) might only score 0.3-0.4 unless they have specific philosophical or feature alignment.`

function buildComparisonPrompt(
  sourceFullName: string,
  targetFullName: string,
  sourceGlossary: RepoGlossaryData,
  targetGlossary: RepoGlossaryData,
): string {
  return `## Repository A: ${sourceFullName}

**Purpose**: ${sourceGlossary.purpose}

**Features**: ${sourceGlossary.features.join(', ') || 'Not specified'}

**Tech Stack**: ${sourceGlossary.techStack.join(', ') || 'Not specified'}

**Target Users**: ${sourceGlossary.targetUsers.join(', ') || 'Not specified'}

**KPIs**: ${sourceGlossary.kpis.join(', ') || 'Not specified'}

**Roadmap**: ${sourceGlossary.roadmap.join(', ') || 'Not specified'}

**Values**: ${sourceGlossary.values.join(', ') || 'Not specified'}

**Enemies**: ${sourceGlossary.enemies.join(', ') || 'Not specified'}

**Aesthetic**: ${sourceGlossary.aesthetic || 'Not specified'}

**Summary**: ${sourceGlossary.summary}

---

## Repository B: ${targetFullName}

**Purpose**: ${targetGlossary.purpose}

**Features**: ${targetGlossary.features.join(', ') || 'Not specified'}

**Tech Stack**: ${targetGlossary.techStack.join(', ') || 'Not specified'}

**Target Users**: ${targetGlossary.targetUsers.join(', ') || 'Not specified'}

**KPIs**: ${targetGlossary.kpis.join(', ') || 'Not specified'}

**Roadmap**: ${targetGlossary.roadmap.join(', ') || 'Not specified'}

**Values**: ${targetGlossary.values.join(', ') || 'Not specified'}

**Enemies**: ${targetGlossary.enemies.join(', ') || 'Not specified'}

**Aesthetic**: ${targetGlossary.aesthetic || 'Not specified'}

**Summary**: ${targetGlossary.summary}

---

Compare these two repositories. Consider:
1. Do they solve related problems?
2. Do they share values or enemies?
3. Could they work together?
4. What might cause friction if combined?`
}

async function compareGlossariesWithAI(
  sourceFullName: string,
  targetFullName: string,
  sourceGlossary: RepoGlossaryData,
  targetGlossary: RepoGlossaryData,
): Promise<ComparisonResult | null> {
  try {
    const prompt = buildComparisonPrompt(
      sourceFullName,
      targetFullName,
      sourceGlossary,
      targetGlossary,
    )

    const { object: result } = await generateObject({
      model: openai('gpt-4o'),
      schema: ComparisonResultSchema,
      system: COMPARISON_SYSTEM_PROMPT,
      prompt,
    })

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(
      { error: message, sourceFullName, targetFullName },
      'AI glossary comparison failed',
    )
    return null
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function generateTitle(
  sourceName: string,
  targetName: string,
  complementary: boolean,
  competing: boolean,
  synergies: string[],
): string {
  if (complementary && synergies.length > 0) {
    // Pick a keyword from first synergy
    const firstSynergy = synergies[0]!
    const keywords = firstSynergy.split(' ').slice(0, 3).join(' ')
    return `${sourceName} + ${targetName}: ${keywords}`
  }

  if (competing) {
    return `${sourceName} & ${targetName}: Same arena`
  }

  if (complementary) {
    return `${sourceName} & ${targetName}: Complementary tools`
  }

  return `${sourceName} & ${targetName}: Kindred spirits`
}
