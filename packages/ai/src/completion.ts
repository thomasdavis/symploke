import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

/**
 * Summary of a file pair for LLM context
 */
export interface FilePairSummary {
  sourceFile: string
  targetFile: string
  avgSimilarity: number
  sampleMatches: Array<{
    sourceSnippet: string
    targetSnippet: string
    similarity: number
  }>
}

/**
 * LLM assessment result for integration opportunity
 */
export interface LLMAssessment {
  shouldWeave: boolean
  score: number
  title: string | null
  description: string | null
  reasoning: string
}

const assessmentSchema = z.object({
  shouldWeave: z
    .boolean()
    .describe('Whether this represents a real integration opportunity between the repositories'),
  score: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score from 0.0 to 1.0 for the integration opportunity'),
  title: z
    .string()
    .nullable()
    .describe('Short title for the integration opportunity (e.g., "Shared Authentication Layer")'),
  description: z
    .string()
    .nullable()
    .describe('Explanation of the integration opportunity and how the repos could work together'),
  reasoning: z.string().describe('Your reasoning for the decision (for debugging purposes)'),
})

/**
 * Assess whether two repositories have an integration opportunity
 * based on similar code sections
 */
export async function assessIntegrationOpportunity(
  repoA: { name: string; fullName: string },
  repoB: { name: string; fullName: string },
  filePairs: FilePairSummary[],
): Promise<LLMAssessment> {
  const filePairsContext = filePairs
    .map((pair, i) => {
      const matchesText = pair.sampleMatches
        .slice(0, 3) // Max 3 samples per file pair
        .map(
          (m, j) =>
            `  Match ${j + 1} (${(m.similarity * 100).toFixed(1)}% similar):\n` +
            `    Source: ${m.sourceSnippet.slice(0, 300)}${m.sourceSnippet.length > 300 ? '...' : ''}\n` +
            `    Target: ${m.targetSnippet.slice(0, 300)}${m.targetSnippet.length > 300 ? '...' : ''}`,
        )
        .join('\n')

      return (
        `File Pair ${i + 1}:\n` +
        `  Source: ${pair.sourceFile}\n` +
        `  Target: ${pair.targetFile}\n` +
        `  Average Similarity: ${(pair.avgSimilarity * 100).toFixed(1)}%\n` +
        matchesText
      )
    })
    .join('\n\n')

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: assessmentSchema,
    system: `You are an expert software architect analyzing code relationships between repositories.

Your task is to determine if there is a meaningful INTEGRATION OPPORTUNITY between two repositories based on similar code sections.

An integration opportunity means:
- One repo has a capability that could be used by the other
- The repos are solving related problems that could benefit from shared infrastructure
- There's potential for code reuse or a shared module

NOT an integration opportunity:
- Both repos just use the same common libraries/frameworks (React, Express, etc.)
- The similarities are just boilerplate or common patterns
- The code is similar but serves completely different domains

Be conservative - only return shouldWeave: true if there's a REAL, ACTIONABLE integration opportunity.`,
    prompt: `Analyze the following similar code sections between two repositories:

Repository A: ${repoA.fullName}
Repository B: ${repoB.fullName}

${filePairsContext}

Based on these similarities, determine:
1. Is there a real integration opportunity (not just common libraries/patterns)?
2. What specific value would integration provide?
3. How confident are you in this assessment?`,
  })

  return object
}
