/**
 * Weave Validation Layer - Symploke v2
 *
 * Verifies that LLM-generated opportunities reference real things:
 * - Files that exist
 * - Functions that exist
 * - Valid evidence
 *
 * Rejects or downgrades opportunities that can't be validated.
 */

import { db } from '@symploke/db'
import { logger } from '@symploke/logger'
import type { ActionableWeave, ActionableOpportunity } from './types/actionable.js'

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a file path exists in the repo
 */
async function fileExists(repoId: string, filePath: string): Promise<boolean> {
  // Normalize path (remove leading ./ or /)
  const normalizedPath = filePath.replace(/^\.?\//, '')

  const file = await db.file.findFirst({
    where: {
      repoId,
      OR: [
        { path: normalizedPath },
        { path: `./${normalizedPath}` },
        { path: `/${normalizedPath}` },
        { path: { endsWith: normalizedPath } },
      ],
    },
    select: { id: true },
  })

  return file !== null
}

/**
 * Check if a function is exported from a file
 * Basic check: look for "export function X" or "export const X" in file content
 */
async function functionExported(repoId: string, functionName: string): Promise<boolean> {
  // Look for the function in any TypeScript/JavaScript file
  const files = await db.file.findMany({
    where: {
      repoId,
      OR: [{ path: { endsWith: '.ts' } }, { path: { endsWith: '.js' } }],
      NOT: { path: { contains: 'node_modules' } },
    },
    select: { content: true },
    take: 100,
  })

  const patterns = [
    new RegExp(`export\\s+(async\\s+)?function\\s+${functionName}\\b`),
    new RegExp(`export\\s+const\\s+${functionName}\\s*=`),
    new RegExp(`export\\s+{[^}]*\\b${functionName}\\b[^}]*}`),
    new RegExp(`exports\\.${functionName}\\s*=`),
  ]

  for (const file of files) {
    if (!file.content) continue
    for (const pattern of patterns) {
      if (pattern.test(file.content)) {
        return true
      }
    }
  }

  return false
}

// ============================================================================
// OPPORTUNITY VALIDATION
// ============================================================================

interface ValidationResult {
  valid: boolean
  issues: string[]
  adjustedScore?: number
}

/**
 * Validate a single opportunity's evidence
 */
async function validateOpportunity(
  opportunity: ActionableOpportunity,
  sourceRepoId: string,
  targetRepoId: string,
): Promise<ValidationResult> {
  const issues: string[] = []

  // Check referenced files
  if (opportunity.evidence.files && opportunity.evidence.files.length > 0) {
    for (const filePath of opportunity.evidence.files) {
      // Try to match file to either repo
      const inSource = await fileExists(sourceRepoId, filePath)
      const inTarget = await fileExists(targetRepoId, filePath)

      if (!inSource && !inTarget) {
        issues.push(`Referenced file not found: ${filePath}`)
      }
    }
  }

  // Check referenced functions
  if (opportunity.evidence.functions && opportunity.evidence.functions.length > 0) {
    for (const funcName of opportunity.evidence.functions) {
      const inSource = await functionExported(sourceRepoId, funcName)
      const inTarget = await functionExported(targetRepoId, funcName)

      if (!inSource && !inTarget) {
        issues.push(`Referenced function not found: ${funcName}`)
      }
    }
  }

  // Check that steps are provided
  if (!opportunity.steps || opportunity.steps.length === 0) {
    issues.push('No implementation steps provided')
  }

  // Check that value is provided
  if (!opportunity.value || opportunity.value.length < 10) {
    issues.push('Value proposition missing or too vague')
  }

  // Determine validity
  // An opportunity is invalid if:
  // - More than 50% of referenced files don't exist
  // - No steps are provided
  const fileIssues = issues.filter((i) => i.includes('file not found')).length
  const totalFiles = opportunity.evidence.files?.length || 0
  const tooManyMissingFiles = totalFiles > 0 && fileIssues > totalFiles / 2

  const valid = !tooManyMissingFiles && opportunity.steps.length > 0

  return {
    valid,
    issues,
    adjustedScore: valid ? undefined : 0.3, // Downgrade invalid opportunities
  }
}

// ============================================================================
// WEAVE VALIDATION
// ============================================================================

/**
 * Validate an entire weave and its opportunities
 * Returns a validated weave with invalid opportunities removed or downgraded
 */
export async function validateWeave(weave: ActionableWeave): Promise<ActionableWeave> {
  if (weave.opportunities.length === 0) {
    return weave
  }

  const validatedOpportunities: ActionableOpportunity[] = []
  let hasValidOpportunity = false

  for (const opportunity of weave.opportunities) {
    const validation = await validateOpportunity(
      opportunity,
      weave.sourceRepoId,
      weave.targetRepoId,
    )

    if (validation.valid) {
      validatedOpportunities.push(opportunity)
      hasValidOpportunity = true
    } else if (validation.issues.length <= 2) {
      // Keep opportunities with minor issues but log them
      logger.debug(
        {
          opportunity: opportunity.title,
          issues: validation.issues,
        },
        'Opportunity has minor validation issues',
      )
      validatedOpportunities.push(opportunity)
    } else {
      // Too many issues, drop the opportunity
      logger.warn(
        {
          opportunity: opportunity.title,
          issues: validation.issues,
        },
        'Dropping opportunity due to validation failures',
      )
    }
  }

  // Adjust score if we removed opportunities
  let adjustedScore = weave.score
  if (validatedOpportunities.length < weave.opportunities.length) {
    const ratio = validatedOpportunities.length / weave.opportunities.length
    adjustedScore = weave.score * ratio
  }

  // If no valid opportunities remain, set low score
  if (!hasValidOpportunity && validatedOpportunities.length === 0) {
    adjustedScore = Math.min(adjustedScore, 0.2)
  }

  return {
    ...weave,
    score: adjustedScore,
    opportunities: validatedOpportunities,
  }
}

/**
 * Quick check if a weave has any substantial evidence
 */
export function hasSubstantialEvidence(weave: ActionableWeave): boolean {
  if (weave.opportunities.length === 0) return false

  return weave.opportunities.some((opp) => {
    const hasFiles = opp.evidence.files && opp.evidence.files.length > 0
    const hasFunctions = opp.evidence.functions && opp.evidence.functions.length > 0
    const hasTodos = opp.evidence.todos && opp.evidence.todos.length > 0
    const hasSteps = opp.steps.length >= 2

    return (hasFiles || hasFunctions || hasTodos) && hasSteps
  })
}
