/**
 * Actionable Weave Comparison - Symploke v2
 *
 * Two-pass comparison:
 * 1. Cheap screening to filter unpromising pairs
 * 2. Deep analysis for promising pairs
 *
 * Every output must be specific, evidenced, and actionable.
 */

import { openai } from '@ai-sdk/openai'
import { logger } from '@symploke/logger'
import { generateObject } from 'ai'
import { z } from 'zod'
import {
  type ActionableWeave,
  type EnhancedGlossary,
  SCREENING_THRESHOLD,
  type ScreeningResult,
  ScreeningResultSchema,
} from './types/actionable.js'

// ============================================================================
// SCREENING PASS (Cheap)
// ============================================================================

const SCREENING_SYSTEM_PROMPT = `You are quickly assessing whether two repositories have ACTIONABLE integration potential.

Score from 0.0 to 1.0 based on concrete signals, not vibes.

HIGH POTENTIAL signals (score higher):
- A exports something B could import
- B has TODOs/issues that A's features could address
- Both share dependencies but solve different problems
- A's output format matches B's input needs
- One repo explicitly mentions needing the other's capability

LOW POTENTIAL signals (score lower):
- Both just use the same language/framework (everyone uses TypeScript)
- Vague "similar values" without concrete integration
- Different problem domains with no overlap
- Competing products with no collaboration opportunity

Output ONLY the screening result. Be decisive.`

function buildScreeningPrompt(
  sourceGlossary: EnhancedGlossary,
  targetGlossary: EnhancedGlossary,
  sourceName: string,
  targetName: string,
): string {
  return `## Source Repository: ${sourceName}
Purpose: ${sourceGlossary.purpose}
Exports: ${JSON.stringify(sourceGlossary.exports, null, 2)}
TODOs: ${sourceGlossary.todos.map((t) => t.text).join(', ') || 'None'}
Help Wanted: ${sourceGlossary.helpWantedFeatures.join(', ') || 'None'}

## Target Repository: ${targetName}
Purpose: ${targetGlossary.purpose}
Exports: ${JSON.stringify(targetGlossary.exports, null, 2)}
TODOs: ${targetGlossary.todos.map((t) => t.text).join(', ') || 'None'}
Help Wanted: ${targetGlossary.helpWantedFeatures.join(', ') || 'None'}

---
Quickly assess: Do these repos have ACTIONABLE integration potential?
If score >= ${SCREENING_THRESHOLD}, recommend deep analysis.`
}

/**
 * Cheap screening to decide if deep analysis is worth it
 */
export async function screenPair(
  sourceGlossary: EnhancedGlossary,
  targetGlossary: EnhancedGlossary,
  sourceName: string,
  targetName: string,
): Promise<ScreeningResult> {
  try {
    const prompt = buildScreeningPrompt(sourceGlossary, targetGlossary, sourceName, targetName)

    const { object: result } = await generateObject({
      model: openai('gpt-4o-mini'), // Cheaper model for screening
      schema: ScreeningResultSchema,
      system: SCREENING_SYSTEM_PROMPT,
      prompt,
    })

    return {
      ...result,
      shouldDeepAnalyze: result.potentialScore >= SCREENING_THRESHOLD,
    }
  } catch (error) {
    logger.error({ error, sourceName, targetName }, 'Screening failed')
    // On error, be conservative and allow deep analysis
    return {
      potentialScore: 0.5,
      shouldDeepAnalyze: true,
      signals: ['Screening failed, allowing deep analysis'],
    }
  }
}

// ============================================================================
// DEEP ANALYSIS PASS (Expensive)
// ============================================================================

const DEEP_ANALYSIS_SYSTEM_PROMPT = `You are analyzing two software repositories to find SPECIFIC, ACTIONABLE, EVIDENCE-BASED integration opportunities.

STRICT RULES:
1. NEVER output generic statements like "both use TypeScript" or "both value code quality"
2. EVERY opportunity MUST reference concrete evidence: filenames, functions, TODOs, issues
3. EVERY opportunity MUST include step-by-step implementation instructions
4. EVERY opportunity MUST have an effort estimate
5. EVERY opportunity MUST have a quantified value proposition

OPPORTUNITY TYPES:
- dependency: A could use B as a library/package
- api-integration: A exposes API that B could consume
- shared-infra: A and B could share infrastructure/config
- contribution-match: A's maintainer has skills B needs
- data-pipeline: A produces data B could consume
- pattern-replication: A solved a problem B has
- merge-candidate: A and B should consider merging efforts

SCORING:
- 0.0–0.3: No actionable evidence found (explain why)
- 0.3–0.5: Abstract opportunities needing investigation
- 0.5–0.7: At least one concrete, evidenced opportunity
- 0.7–0.9: Multiple high-value opportunities with evidence
- 0.9–1.0: Obvious integration that should definitely happen

If you cannot find SPECIFIC opportunities with EVIDENCE, output a low score and explain what additional information would be needed.

DO NOT invent opportunities. If there's no clear integration, say so.`

function buildDeepAnalysisPrompt(
  sourceGlossary: EnhancedGlossary,
  targetGlossary: EnhancedGlossary,
  sourceName: string,
  targetName: string,
): string {
  return `## Source Repository: ${sourceName}

### Identity
- Purpose: ${sourceGlossary.purpose}
- Problems Solved: ${sourceGlossary.problemsSolved.join(', ') || 'Not specified'}
- Target Users: ${sourceGlossary.targetUsers.join(', ') || 'Not specified'}
- Maturity: ${sourceGlossary.maturity}

### Provides (Exports)
- Packages: ${sourceGlossary.exports.packages.map((p) => p.name).join(', ') || 'None'}
- APIs: ${sourceGlossary.exports.apis.map((a) => `${a.method} ${a.path}`).join(', ') || 'None'}
- Functions: ${sourceGlossary.exports.functions.join(', ') || 'None'}
- Types: ${sourceGlossary.exports.types.join(', ') || 'None'}
- Schemas: ${sourceGlossary.exports.schemas.join(', ') || 'None'}

### Uses (Imports)
- Dependencies: ${sourceGlossary.imports.dependencies.join(', ') || 'None'}
- External APIs: ${sourceGlossary.imports.apis.join(', ') || 'None'}
- Patterns: ${sourceGlossary.imports.patterns.join(', ') || 'None'}

### Integration Surface
- Entry Points: ${sourceGlossary.entryPoints.join(', ') || 'None'}
- Extension Points: Plugins=${sourceGlossary.extensionPoints.plugins}, Middleware=${sourceGlossary.extensionPoints.middleware}, Hooks=${sourceGlossary.extensionPoints.hooks}

### Needs & Gaps
- TODOs: ${sourceGlossary.todos.map((t) => `${t.file}:${t.line} - ${t.text}`).join('; ') || 'None'}
- Help Wanted Features: ${sourceGlossary.helpWantedFeatures.join(', ') || 'None'}
- Help Wanted Skills: ${sourceGlossary.helpWantedSkills.join(', ') || 'None'}
- Limitations: ${sourceGlossary.limitations.join(', ') || 'None'}

---

## Target Repository: ${targetName}

### Identity
- Purpose: ${targetGlossary.purpose}
- Problems Solved: ${targetGlossary.problemsSolved.join(', ') || 'Not specified'}
- Target Users: ${targetGlossary.targetUsers.join(', ') || 'Not specified'}
- Maturity: ${targetGlossary.maturity}

### Provides (Exports)
- Packages: ${targetGlossary.exports.packages.map((p) => p.name).join(', ') || 'None'}
- APIs: ${targetGlossary.exports.apis.map((a) => `${a.method} ${a.path}`).join(', ') || 'None'}
- Functions: ${targetGlossary.exports.functions.join(', ') || 'None'}
- Types: ${targetGlossary.exports.types.join(', ') || 'None'}
- Schemas: ${targetGlossary.exports.schemas.join(', ') || 'None'}

### Uses (Imports)
- Dependencies: ${targetGlossary.imports.dependencies.join(', ') || 'None'}
- External APIs: ${targetGlossary.imports.apis.join(', ') || 'None'}
- Patterns: ${targetGlossary.imports.patterns.join(', ') || 'None'}

### Integration Surface
- Entry Points: ${targetGlossary.entryPoints.join(', ') || 'None'}
- Extension Points: Plugins=${targetGlossary.extensionPoints.plugins}, Middleware=${targetGlossary.extensionPoints.middleware}, Hooks=${targetGlossary.extensionPoints.hooks}

### Needs & Gaps
- TODOs: ${targetGlossary.todos.map((t) => `${t.file}:${t.line} - ${t.text}`).join('; ') || 'None'}
- Help Wanted Features: ${targetGlossary.helpWantedFeatures.join(', ') || 'None'}
- Help Wanted Skills: ${targetGlossary.helpWantedSkills.join(', ') || 'None'}
- Limitations: ${targetGlossary.limitations.join(', ') || 'None'}

---

Find SPECIFIC, ACTIONABLE integration opportunities between ${sourceName} and ${targetName}.
Reference concrete files, functions, TODOs, and issues. Include step-by-step implementation.
If no concrete opportunities exist, explain why and score low.`
}

// Schema for the LLM response (without the repo IDs which we add after)
const DeepAnalysisResponseSchema = z.object({
  score: z.number().min(0).max(1),
  opportunities: z.array(
    z.object({
      type: z.enum([
        'dependency',
        'api-integration',
        'shared-infra',
        'contribution-match',
        'data-pipeline',
        'pattern-replication',
        'merge-candidate',
      ]),
      title: z.string(),
      description: z.string(),
      evidence: z.object({
        files: z.array(z.string()).optional(),
        functions: z.array(z.string()).optional(),
        issues: z.array(z.string()).optional(),
        todos: z.array(z.string()).optional(),
      }),
      steps: z.array(z.string()),
      effort: z.enum(['trivial', 'small', 'medium', 'large']),
      value: z.string(),
    }),
  ),
  noOpportunityReason: z.string().optional(),
})

/**
 * Deep analysis to find actionable opportunities
 */
export async function analyzeDeep(
  sourceRepoId: string,
  targetRepoId: string,
  sourceGlossary: EnhancedGlossary,
  targetGlossary: EnhancedGlossary,
  sourceName: string,
  targetName: string,
): Promise<ActionableWeave> {
  try {
    const prompt = buildDeepAnalysisPrompt(sourceGlossary, targetGlossary, sourceName, targetName)

    const { object: result } = await generateObject({
      model: openai('gpt-4o'),
      schema: DeepAnalysisResponseSchema,
      system: DEEP_ANALYSIS_SYSTEM_PROMPT,
      prompt,
    })

    return {
      score: result.score,
      sourceRepoId,
      targetRepoId,
      opportunities: result.opportunities,
      analysisDepth: 'deep',
      noOpportunityReason: result.noOpportunityReason,
    }
  } catch (error) {
    logger.error({ error, sourceName, targetName }, 'Deep analysis failed')
    return {
      score: 0,
      sourceRepoId,
      targetRepoId,
      opportunities: [],
      analysisDepth: 'deep',
      noOpportunityReason: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// ============================================================================
// COMBINED ANALYSIS
// ============================================================================

export interface CompareOptions {
  skipScreening?: boolean // Always do deep analysis
}

/**
 * Full comparison: screening + deep analysis if promising
 */
export async function compareForActionableWeaves(
  sourceRepoId: string,
  targetRepoId: string,
  sourceGlossary: EnhancedGlossary,
  targetGlossary: EnhancedGlossary,
  sourceName: string,
  targetName: string,
  options: CompareOptions = {},
): Promise<ActionableWeave | null> {
  // Step 1: Screening (unless skipped)
  if (!options.skipScreening) {
    const screening = await screenPair(sourceGlossary, targetGlossary, sourceName, targetName)

    logger.debug(
      {
        sourceName,
        targetName,
        potentialScore: screening.potentialScore,
        shouldDeepAnalyze: screening.shouldDeepAnalyze,
        signals: screening.signals,
      },
      'Screening complete',
    )

    if (!screening.shouldDeepAnalyze) {
      // Return a minimal result for skipped pairs
      return {
        score: screening.potentialScore,
        sourceRepoId,
        targetRepoId,
        opportunities: [],
        analysisDepth: 'screening',
        noOpportunityReason: screening.skipReason || 'Below screening threshold',
      }
    }
  }

  // Step 2: Deep analysis
  const weave = await analyzeDeep(
    sourceRepoId,
    targetRepoId,
    sourceGlossary,
    targetGlossary,
    sourceName,
    targetName,
  )

  logger.info(
    {
      sourceName,
      targetName,
      score: weave.score,
      opportunityCount: weave.opportunities.length,
      types: weave.opportunities.map((o) => o.type),
    },
    'Deep analysis complete',
  )

  return weave
}
