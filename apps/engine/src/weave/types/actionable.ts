/**
 * Actionable Weave Types - Symploke v2
 *
 * These types define the new evidence-based, actionable weave system.
 * Every weave must be specific enough to act on TODAY.
 */

import { z } from 'zod'

// ============================================================================
// OPPORTUNITY TYPES
// ============================================================================

export const OpportunityType = z.enum([
  'dependency', // A could use B as a library
  'api-integration', // A exposes API that B could consume
  'shared-infra', // A and B could share infrastructure/config
  'contribution-match', // A's maintainer has skills B needs
  'data-pipeline', // A produces data B could consume
  'pattern-replication', // A solved a problem B has
  'merge-candidate', // A and B should consider merging
])

export type OpportunityType = z.infer<typeof OpportunityType>

// ============================================================================
// EFFORT ESTIMATES
// ============================================================================

export const EffortEstimate = z.enum([
  'trivial', // < 1 hour
  'small', // 1-4 hours
  'medium', // 1-2 days
  'large', // 1+ week
])

export type EffortEstimate = z.infer<typeof EffortEstimate>

// ============================================================================
// ENHANCED GLOSSARY - Technical contract, not vibes
// ============================================================================

export const ApiEndpointSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string(),
  description: z.string().optional(),
})

export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>

export const TodoItemSchema = z.object({
  file: z.string(),
  line: z.number(),
  text: z.string(),
})

export type TodoItem = z.infer<typeof TodoItemSchema>

export const EnhancedGlossarySchema = z.object({
  // === IDENTITY ===
  purpose: z.string().describe('One clear sentence: what problem does this solve?'),
  problemsSolved: z.array(z.string()).describe('Specific problems this repo addresses'),
  targetUsers: z.array(z.string()).describe('Who uses this? Be specific.'),
  maturity: z.enum(['prototype', 'beta', 'production', 'maintained']).describe('Development stage'),

  // === PROVIDES (EXPORTS) ===
  exports: z.object({
    packages: z
      .array(
        z.object({
          name: z.string(),
          path: z.string(),
        }),
      )
      .describe('npm packages published or publishable'),
    apis: z.array(ApiEndpointSchema).describe('REST/GraphQL endpoints exposed'),
    functions: z.array(z.string()).describe('Key exported public functions'),
    types: z.array(z.string()).describe('Key exported types/interfaces'),
    schemas: z.array(z.string()).describe('JSON schemas or data structure definitions'),
  }),

  // === USES (IMPORTS) ===
  imports: z.object({
    dependencies: z.array(z.string()).describe('Key npm dependencies'),
    apis: z.array(z.string()).describe('External APIs consumed'),
    patterns: z
      .array(z.string())
      .describe('Design patterns used (e.g., middleware, plugin, event-driven)'),
  }),

  // === INTEGRATION SURFACE ===
  entryPoints: z.array(z.string()).describe('Main files where others would hook in'),
  extensionPoints: z.object({
    plugins: z.boolean().describe('Supports plugin architecture'),
    middleware: z.boolean().describe('Supports middleware'),
    hooks: z.boolean().describe('Provides lifecycle hooks'),
    customTypes: z.boolean().describe('Allows custom type definitions'),
  }),

  // === NEEDS & GAPS ===
  todos: z.array(TodoItemSchema).describe('TODO comments found in code'),
  helpWantedFeatures: z.array(z.string()).describe('Features requested in issues'),
  helpWantedSkills: z.array(z.string()).describe('Skills needed for open issues'),
  limitations: z.array(z.string()).describe('Known limitations mentioned'),

  // === REPO HEALTH ===
  maintainers: z.object({
    count: z.number(),
    activity: z.enum(['active', 'sporadic', 'dormant']),
  }),
  community: z.object({
    stars: z.number(),
    forks: z.number(),
    contributors: z.number(),
  }),
})

export type EnhancedGlossary = z.infer<typeof EnhancedGlossarySchema>

// ============================================================================
// ACTIONABLE OPPORTUNITY - The core output
// ============================================================================

export const EvidenceSchema = z.object({
  files: z.array(z.string()).optional().describe('Precise file paths referenced'),
  functions: z.array(z.string()).optional().describe('Exported functions involved'),
  issues: z.array(z.string()).optional().describe('GitHub issue numbers/URLs'),
  todos: z.array(z.string()).optional().describe('TODO lines referenced'),
})

export type Evidence = z.infer<typeof EvidenceSchema>

export const ActionableOpportunitySchema = z.object({
  type: OpportunityType,
  title: z.string().describe('Short, specific title (e.g., "Use @blocks/validate for input")'),
  description: z.string().describe('One sentence explaining the opportunity'),

  evidence: EvidenceSchema.describe('Concrete proof this opportunity exists'),

  steps: z.array(z.string()).describe('Step-by-step implementation instructions'),
  effort: EffortEstimate,
  value: z.string().describe('Quantified benefit (e.g., "Removes 50 lines of validation code")'),
})

export type ActionableOpportunity = z.infer<typeof ActionableOpportunitySchema>

// ============================================================================
// ACTIONABLE WEAVE - Full comparison result
// ============================================================================

export const ActionableWeaveSchema = z.object({
  score: z.number().min(0).max(1).describe('Actionability score'),
  sourceRepoId: z.string(),
  targetRepoId: z.string(),
  opportunities: z.array(ActionableOpportunitySchema),

  // Meta
  analysisDepth: z.enum(['screening', 'deep']).describe('How thorough was the analysis'),
  noOpportunityReason: z.string().optional().describe('If score < 0.3, why no opportunities found'),
})

export type ActionableWeave = z.infer<typeof ActionableWeaveSchema>

// ============================================================================
// SCREENING RESULT - Cheap pre-filter
// ============================================================================

export const ScreeningResultSchema = z.object({
  potentialScore: z.number().min(0).max(1),
  shouldDeepAnalyze: z.boolean(),
  signals: z.array(z.string()).describe('What signals suggest opportunity'),
  skipReason: z.string().optional().describe('If skipping, why'),
})

export type ScreeningResult = z.infer<typeof ScreeningResultSchema>

// ============================================================================
// SCORING GUIDELINES
// ============================================================================

/**
 * Scoring Rules:
 *
 * 0.0–0.3: No actionable evidence found
 *   - Skip or mark as "no opportunity"
 *   - Require explanation of why
 *
 * 0.3–0.5: Abstract or vague opportunities
 *   - Some potential but needs investigation
 *   - Missing concrete evidence
 *
 * 0.5–0.7: At least one concrete opportunity
 *   - Has file/function evidence
 *   - Has implementation steps
 *   - Clear value proposition
 *
 * 0.7–0.9: Multiple high-value, evidenced opportunities
 *   - Several concrete integrations possible
 *   - Strong evidence for each
 *
 * 0.9–1.0: Obvious integration with high ROI
 *   - Should definitely happen
 *   - Trivial to implement
 *   - High value
 */
export const SCREENING_THRESHOLD = 0.35
export const MIN_ACTIONABLE_SCORE = 0.5
