import { openai } from '@ai-sdk/openai'
import { db, GlossaryStatus, WeaveType as PrismaWeaveType } from '@symploke/db'
import { logger } from '@symploke/logger'
import { generateObject } from 'ai'
import { z } from 'zod'
import { extractGlossary, getGlossary, type RepoGlossaryData } from '../glossary.js'
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

    // Get glossaries, generating if needed
    let [sourceGlossary, targetGlossary] = await Promise.all([
      getGlossary(sourceRepoId),
      getGlossary(targetRepoId),
    ])

    // Generate missing glossaries
    if (!sourceGlossary) {
      logger.info(
        { sourceRepoId, repoName: sourceRepo.fullName },
        'Generating missing glossary for source repo',
      )
      sourceGlossary = await extractGlossary(sourceRepoId)
    }
    if (!targetGlossary) {
      logger.info(
        { targetRepoId, repoName: targetRepo.fullName },
        'Generating missing glossary for target repo',
      )
      targetGlossary = await extractGlossary(targetRepoId)
    }

    // Get glossary records for IDs (after potential generation)
    const [sourceGlossaryRecord, targetGlossaryRecord] = await Promise.all([
      db.repoGlossary.findUnique({ where: { repoId: sourceRepoId } }),
      db.repoGlossary.findUnique({ where: { repoId: targetRepoId } }),
    ])

    // Check if both have complete glossaries (some repos may be unglossable)
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
          sourceStatus: sourceGlossaryRecord?.status,
          targetStatus: targetGlossaryRecord?.status,
        },
        'One or both repos could not be glossarized',
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
        relationshipType: comparison.relationshipType,
        integrationOpportunities: comparison.integrationOpportunities.length,
        supplyDemandMatches: comparison.supplyDemandMatches.length,
        pipelineConnections: comparison.pipelineConnections.length,
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
      comparison.relationshipType,
      comparison.integrationOpportunities,
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
      relationshipType: comparison.relationshipType,
      integrationOpportunities: comparison.integrationOpportunities,
      supplyDemandMatches: comparison.supplyDemandMatches,
      pipelineConnections: comparison.pipelineConnections,
      sharedChallenges: comparison.sharedChallenges,
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
      '2-3 sentences explaining the ACTIONABLE relationship between these repositories. Focus on specific integrations possible, not vague similarities.',
    ),
  overallScore: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Integration potential from 0 to 1. 0 = no practical connection, 0.5 = some overlap worth exploring, 1 = strong integration opportunity',
    ),
  relationshipType: z
    .enum([
      'supply_demand',
      'pipeline',
      'shared_domain',
      'complementary_tools',
      'philosophical_alignment',
      'competing',
    ])
    .describe(
      'Primary relationship type: supply_demand (A provides what B needs), pipeline (A outputs what B inputs), shared_domain (same problem space), complementary_tools (different strengths), philosophical_alignment (shared values/enemies), competing (similar solutions)',
    ),
  integrationOpportunities: z
    .array(z.string())
    .describe(
      'SPECIFIC integration ideas. Not "could work together" but "B could use A\'s PDF generation for its resume output" or "A\'s CLI could load B\'s MCP tools"',
    ),
  supplyDemandMatches: z
    .array(z.string())
    .describe('Specific matches: "A provides X, B needs X". List actual matches found.'),
  pipelineConnections: z
    .array(z.string())
    .describe(
      'Data flow opportunities: "A outputs Y, B consumes Y". List actual data/artifact connections.',
    ),
  sharedChallenges: z
    .array(z.string())
    .describe('Problems both repos face that could be solved together.'),
  tensions: z
    .array(z.string())
    .describe(
      'Technical or philosophical conflicts that would make integration difficult (0-3 items)',
    ),
})

type ComparisonResult = z.infer<typeof ComparisonResultSchema>

const COMPARISON_SYSTEM_PROMPT = `You are finding ACTIONABLE integration opportunities between two software repositories.

Your goal is NOT to describe vague similarities. Your goal is to find SPECIFIC, PRACTICAL ways these repos could work together.

PRIORITY ORDER:
1. SUPPLY/DEMAND: Does A provide something B needs? Does B provide something A needs?
   - Check A's "provides" against B's "consumes" and "gaps"
   - Check B's "provides" against A's "consumes" and "gaps"

2. PIPELINE: Could data flow between them?
   - Does A output something B could consume?
   - Do their APIs connect naturally?

3. SHARED DOMAIN: Do they work on the same problems?
   - Could they share code, tools, or approaches?
   - Would users of one benefit from the other?

4. COMPLEMENTARY: Do they have different strengths that combine well?
   - CLI + library, frontend + backend, analysis + generation

5. PHILOSOPHICAL: Do they share values or fight the same enemies?
   - This is the WEAKEST form of connection - only mention if strong

SCORING:
- 0.0-0.2: No practical connection (just "both are software")
- 0.2-0.4: Vague domain overlap, no clear integration path
- 0.4-0.6: Real integration possible with some work
- 0.6-0.8: Natural fit - clear integration opportunity
- 0.8-1.0: Perfect match - A provides exactly what B needs or vice versa

BE CONCRETE. Instead of "could work together", say "B's resume templates could use A's PDF generation API".
If there's no real integration opportunity, say so honestly and score low.`

function buildComparisonPrompt(
  sourceFullName: string,
  targetFullName: string,
  sourceGlossary: RepoGlossaryData,
  targetGlossary: RepoGlossaryData,
): string {
  return `## Repository A: ${sourceFullName}

**What It Is**
- Purpose: ${sourceGlossary.purpose}
- Category: ${sourceGlossary.category || 'Not specified'}
- Domain: ${sourceGlossary.domain || 'Not specified'}

**What It PROVIDES** (things others could use)
- Capabilities: ${sourceGlossary.provides.join(', ') || 'Not specified'}
- Outputs: ${sourceGlossary.outputs.join(', ') || 'Not specified'}
- APIs/Interfaces: ${sourceGlossary.apis.join(', ') || 'Not specified'}

**What It NEEDS** (things it could get from others)
- Consumes: ${sourceGlossary.consumes.join(', ') || 'Not specified'}
- Dependencies: ${sourceGlossary.dependencies.join(', ') || 'Not specified'}
- Gaps/Wants: ${sourceGlossary.gaps.join(', ') || 'Not specified'}

**Technical**
- Stack: ${sourceGlossary.techStack.join(', ') || 'Not specified'}
- Patterns: ${sourceGlossary.patterns.join(', ') || 'Not specified'}

**Philosophy**
- Values: ${sourceGlossary.values.join(', ') || 'Not specified'}
- Avoids: ${sourceGlossary.antipatterns.join(', ') || 'Not specified'}

**Summary**: ${sourceGlossary.summary}

---

## Repository B: ${targetFullName}

**What It Is**
- Purpose: ${targetGlossary.purpose}
- Category: ${targetGlossary.category || 'Not specified'}
- Domain: ${targetGlossary.domain || 'Not specified'}

**What It PROVIDES** (things others could use)
- Capabilities: ${targetGlossary.provides.join(', ') || 'Not specified'}
- Outputs: ${targetGlossary.outputs.join(', ') || 'Not specified'}
- APIs/Interfaces: ${targetGlossary.apis.join(', ') || 'Not specified'}

**What It NEEDS** (things it could get from others)
- Consumes: ${targetGlossary.consumes.join(', ') || 'Not specified'}
- Dependencies: ${targetGlossary.dependencies.join(', ') || 'Not specified'}
- Gaps/Wants: ${targetGlossary.gaps.join(', ') || 'Not specified'}

**Technical**
- Stack: ${targetGlossary.techStack.join(', ') || 'Not specified'}
- Patterns: ${targetGlossary.patterns.join(', ') || 'Not specified'}

**Philosophy**
- Values: ${targetGlossary.values.join(', ') || 'Not specified'}
- Avoids: ${targetGlossary.antipatterns.join(', ') || 'Not specified'}

**Summary**: ${targetGlossary.summary}

---

Find ACTIONABLE integration opportunities:
1. Does A provide something B needs or wants?
2. Does B provide something A needs or wants?
3. Could A's outputs feed into B's inputs (or vice versa)?
4. Do they work in the same domain where integration makes sense?
5. What technical or philosophical tensions would block integration?`
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

type RelationshipType =
  | 'supply_demand'
  | 'pipeline'
  | 'shared_domain'
  | 'complementary_tools'
  | 'philosophical_alignment'
  | 'competing'

function generateTitle(
  sourceName: string,
  targetName: string,
  relationshipType: RelationshipType,
  integrationOpportunities: string[],
): string {
  // If we have a specific integration opportunity, use it
  if (integrationOpportunities.length > 0) {
    const firstOpp = integrationOpportunities[0]!
    // Truncate to first ~40 chars at word boundary
    const truncated =
      firstOpp.length > 45 ? firstOpp.slice(0, 42).replace(/\s+\S*$/, '...') : firstOpp
    return `${sourceName} + ${targetName}: ${truncated}`
  }

  // Fall back to relationship type
  const typeLabels: Record<RelationshipType, string> = {
    supply_demand: 'Supply meets demand',
    pipeline: 'Data pipeline',
    shared_domain: 'Same domain',
    complementary_tools: 'Complementary tools',
    philosophical_alignment: 'Shared values',
    competing: 'Alternative approaches',
  }

  return `${sourceName} & ${targetName}: ${typeLabels[relationshipType]}`
}
