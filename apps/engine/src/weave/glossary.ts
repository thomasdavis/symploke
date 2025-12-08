/**
 * Repository Glossary Extraction
 *
 * A Glossary is a hybrid profile of a repository: practical information about
 * what it does, and philosophical insights about what it believes.
 *
 * Input: README only (simpler, more reliable than parsing code)
 * Output: Structured profile for AI-powered comparison
 */

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { db, GlossaryStatus } from '@symploke/db'
import { logger } from '@symploke/logger'

// ============================================================================
// GLOSSARY TYPES
// ============================================================================

/**
 * A repository glossary profile
 */
export interface RepoGlossaryData {
  // PRACTICAL
  purpose: string // One-sentence: what problem does this solve?
  features: string[] // Key capabilities/features
  techStack: string[] // Languages, frameworks, tools mentioned
  targetUsers: string[] // Who is this for?
  kpis: string[] // Metrics, measures, what success looks like
  roadmap: string[] // Future plans, TODOs, aspirations

  // PHILOSOPHICAL
  values: string[] // Core beliefs, virtues, what it considers "good"
  enemies: string[] // What it fights against, defines itself against
  aesthetic: string // Design philosophy, code style preferences

  // META
  confidence: number // 0-1, based on README quality
  summary: string // 2-3 sentence overall summary
}

// ============================================================================
// ZOD SCHEMAS FOR LLM EXTRACTION
// ============================================================================

const GlossarySchema = z.object({
  // PRACTICAL
  purpose: z
    .string()
    .describe(
      'One clear sentence describing what problem this repository solves. Be specific, not generic.',
    ),
  features: z
    .array(z.string())
    .describe('3-8 key features or capabilities this repository provides'),
  techStack: z
    .array(z.string())
    .describe('Languages, frameworks, libraries, and tools mentioned or implied'),
  targetUsers: z
    .array(z.string())
    .describe('Who is this repository for? Be specific about the type of developer or user'),
  kpis: z
    .array(z.string())
    .describe(
      'What metrics or measures indicate success? What does this repo care about optimizing?',
    ),
  roadmap: z
    .array(z.string())
    .describe('Future plans, TODOs, aspirations, or areas for improvement mentioned'),

  // PHILOSOPHICAL
  values: z
    .array(z.string())
    .describe(
      'Core beliefs and virtues this repository embodies. What does it consider "good" or important?',
    ),
  enemies: z
    .array(z.string())
    .describe(
      'What does this repository fight against? What problems, patterns, or approaches does it reject?',
    ),
  aesthetic: z.string().describe('The design philosophy and coding style this repository prefers'),

  // META
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Confidence in this analysis (0-1). Lower if README is sparse, vague, or marketing-heavy.',
    ),
  summary: z
    .string()
    .describe(
      '2-3 sentence summary capturing both what this repo DOES and what it BELIEVES. Be opinionated.',
    ),
})

// ============================================================================
// EXTRACTION PROMPTS
// ============================================================================

const GLOSSARY_SYSTEM_PROMPT = `You are analyzing a software repository to create a comprehensive profile.

Your task is to extract both PRACTICAL and PHILOSOPHICAL information from the README.

PRACTICAL (what it does):
- Purpose: What specific problem does this solve?
- Features: What can users do with it?
- Tech Stack: What technologies does it use?
- Target Users: Who should use this?
- KPIs: What does success look like?
- Roadmap: What's planned or missing?

PHILOSOPHICAL (what it believes):
- Values: What does it consider important or "good"?
- Enemies: What does it fight against or reject?
- Aesthetic: What style or approach does it prefer?

Be specific and opinionated. Avoid generic statements like "makes development easier."
If the README is sparse, acknowledge this with lower confidence.
If the README is marketing-heavy with little substance, call that out.

Look for:
- Explicit statements of philosophy (e.g., "we believe in...")
- Implicit values (what they choose to emphasize)
- What problems they describe with emotional language (enemies)
- Technical choices that reveal priorities`

function buildGlossaryPrompt(fullName: string, readme: string): string {
  return `## Repository: ${fullName}

**README Content:**
${readme}

---

Create a comprehensive profile for this repository based on its README.
Be honest about what you can and cannot determine from this content.`
}

// ============================================================================
// CONTENT GATHERING
// ============================================================================

async function getReadmeContent(repoId: string): Promise<string | null> {
  const readmeFile = await db.file.findFirst({
    where: {
      repoId,
      path: {
        in: ['README.md', 'readme.md', 'Readme.md', 'README', 'readme', 'README.MD'],
      },
    },
    select: { content: true },
  })
  return readmeFile?.content || null
}

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Extract a glossary for a repository from its README
 */
export async function extractGlossary(
  repoId: string,
  options: { force?: boolean } = {},
): Promise<RepoGlossaryData | null> {
  const repo = await db.repo.findUnique({
    where: { id: repoId },
    select: { id: true, fullName: true },
  })

  if (!repo) {
    logger.warn({ repoId }, 'Repository not found for glossary extraction')
    return null
  }

  // Check if glossary already exists (unless force)
  if (!options.force) {
    const existing = await db.repoGlossary.findUnique({
      where: { repoId },
    })
    if (existing && existing.status === GlossaryStatus.COMPLETE) {
      logger.info({ repoId, fullName: repo.fullName }, 'Glossary already exists, skipping')
      return parseGlossaryFromDb(existing)
    }
  }

  logger.info({ repoId, fullName: repo.fullName }, 'Extracting glossary')

  // Create or update glossary record with EXTRACTING status
  await db.repoGlossary.upsert({
    where: { repoId },
    create: {
      repoId,
      status: GlossaryStatus.EXTRACTING,
      terms: [],
      empirics: {},
      psychology: {},
      poetics: {},
      philosophy: {},
      resentments: {},
    },
    update: {
      status: GlossaryStatus.EXTRACTING,
    },
  })

  // Get README only
  const readme = await getReadmeContent(repoId)

  // Check if we have enough content
  if (!readme || readme.length < 100) {
    logger.info(
      { repoId, fullName: repo.fullName, readmeLength: readme?.length || 0 },
      'README too short for glossary extraction',
    )

    await db.repoGlossary.update({
      where: { repoId },
      data: {
        status: GlossaryStatus.UNGLOSSABLE,
        unglossableReason: `README is ${readme ? `too short (${readme.length} chars)` : 'missing'}. Cannot extract meaningful profile.`,
      },
    })

    return null
  }

  try {
    // Truncate README if very long
    const readmeContent = readme.slice(0, 8000)

    const prompt = buildGlossaryPrompt(repo.fullName, readmeContent)

    const { object: glossary } = await generateObject({
      model: openai('gpt-4o'),
      schema: GlossarySchema,
      system: GLOSSARY_SYSTEM_PROMPT,
      prompt,
    })

    // Store the glossary - map to existing DB schema (JSON fields)
    await db.repoGlossary.update({
      where: { repoId },
      data: {
        status: GlossaryStatus.COMPLETE,
        terms: [],
        empirics: {
          purpose: glossary.purpose,
          features: glossary.features,
          techStack: glossary.techStack,
          targetUsers: glossary.targetUsers,
          kpis: glossary.kpis,
          roadmap: glossary.roadmap,
        },
        psychology: {},
        poetics: {
          aesthetic: glossary.aesthetic,
        },
        philosophy: {
          values: glossary.values,
          enemies: glossary.enemies,
        },
        resentments: {},
        futureVision: glossary.summary,
        confidence: glossary.confidence,
        extractedAt: new Date(),
      },
    })

    logger.info(
      {
        repoId,
        fullName: repo.fullName,
        featureCount: glossary.features.length,
        valueCount: glossary.values.length,
        enemyCount: glossary.enemies.length,
        confidence: glossary.confidence,
      },
      'Glossary extraction complete',
    )

    return glossary as RepoGlossaryData
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error({ error: message, repoId, fullName: repo.fullName }, 'Glossary extraction failed')

    await db.repoGlossary.update({
      where: { repoId },
      data: {
        status: GlossaryStatus.FAILED,
        unglossableReason: message,
      },
    })

    return null
  }
}

/**
 * Parse a glossary record from the database into RepoGlossaryData
 */
function parseGlossaryFromDb(record: {
  empirics: unknown
  poetics: unknown
  philosophy: unknown
  futureVision: string | null
  confidence: number | null
}): RepoGlossaryData | null {
  try {
    const empirics = record.empirics as Record<string, unknown>
    const philosophy = record.philosophy as Record<string, unknown>
    const poetics = record.poetics as Record<string, unknown>

    return {
      purpose: (empirics?.purpose as string) || '',
      features: (empirics?.features as string[]) || [],
      techStack: (empirics?.techStack as string[]) || [],
      targetUsers: (empirics?.targetUsers as string[]) || [],
      kpis: (empirics?.kpis as string[]) || [],
      roadmap: (empirics?.roadmap as string[]) || [],
      values: (philosophy?.values as string[]) || [],
      enemies: (philosophy?.enemies as string[]) || [],
      aesthetic: (poetics?.aesthetic as string) || '',
      confidence: record.confidence || 0,
      summary: record.futureVision || '',
    }
  } catch {
    return null
  }
}

/**
 * Extract glossaries for all repos in a plexus
 */
export async function extractPlexusGlossaries(
  plexusId: string,
  options: { force?: boolean } = {},
): Promise<{ extracted: number; skipped: number; failed: number }> {
  const repos = await db.repo.findMany({
    where: { plexusId },
    select: { id: true, fullName: true },
  })

  logger.info({ plexusId, repoCount: repos.length }, 'Extracting glossaries for plexus')

  let extracted = 0
  let skipped = 0
  let failed = 0

  for (const repo of repos) {
    try {
      const result = await extractGlossary(repo.id, options)
      if (result) {
        extracted++
      } else {
        // Check if it was skipped or marked unglossable
        const glossary = await db.repoGlossary.findUnique({ where: { repoId: repo.id } })
        if (glossary?.status === GlossaryStatus.UNGLOSSABLE) {
          skipped++
        } else if (glossary?.status === GlossaryStatus.COMPLETE && !options.force) {
          skipped++
        } else {
          failed++
        }
      }
    } catch {
      failed++
    }
  }

  logger.info({ plexusId, extracted, skipped, failed }, 'Plexus glossary extraction complete')

  return { extracted, skipped, failed }
}

/**
 * Get a repository's glossary
 */
export async function getGlossary(repoId: string): Promise<RepoGlossaryData | null> {
  const glossary = await db.repoGlossary.findUnique({
    where: { repoId },
  })

  if (!glossary || glossary.status !== GlossaryStatus.COMPLETE) {
    return null
  }

  return parseGlossaryFromDb(glossary)
}
