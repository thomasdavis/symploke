/**
 * Repository Glossary Extraction
 *
 * A Glossary is a repository's self-portrait: its vocabulary, its beliefs,
 * its resentments, its poetry. It is the soul of a codebase made legible.
 *
 * The Glossary captures dimensions that code similarity will never find:
 * - Empirical nature: What does it measure? What does it consider evidence?
 * - Psychology: What does it fear? What gives it confidence?
 * - Poetics: What metaphors structure its thinking? What rhythm does its code have?
 * - Philosophy: What does it believe about software, developers, truth?
 * - Resentments: What does it hate? What does it define itself against?
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
 * A term in the repository's vocabulary
 */
export interface GlossaryTerm {
  term: string
  definition: string
  context: string
  emotionalValence: 'positive' | 'negative' | 'neutral' | 'sacred' | 'profane'
  frequency: 'ubiquitous' | 'common' | 'rare' | 'once'
}

/**
 * The empirical nature of the repository - what it measures and considers evidence
 */
export interface GlossaryEmpirics {
  measures: string[] // What it measures/counts
  evidenceTypes: string[] // What it considers proof
  truthClaims: string[] // Assertions it makes about reality
  uncertainties: string[] // What it admits not knowing
}

/**
 * The psychology of the repository - its fears, confidences, and defenses
 */
export interface GlossaryPsychology {
  fears: string[] // What threatens its existence
  confidences: string[] // Where it feels sure of itself
  defenses: string[] // How it protects itself
  attachments: string[] // What it can't let go of
  blindSpots: string[] // What it refuses to see
}

/**
 * The poetics of the repository - its metaphors, rhythm, and voice
 */
export interface GlossaryPoetics {
  metaphors: string[] // Structural metaphors (building, flow, tree, etc)
  namingPatterns: string[] // How it names things
  aesthetic: string // Its sense of beauty
  rhythm: string // Fast/slow, dense/sparse, etc
  voice: string // How it speaks (formal, casual, urgent, etc)
}

/**
 * The philosophy of the repository - its beliefs and assumptions
 */
export interface GlossaryPhilosophy {
  beliefs: string[] // What it takes as axioms
  assumptions: string[] // What it assumes without stating
  virtues: string[] // What it considers good
  epistemology: string // How it knows what it knows
  ontology: string // What it thinks exists
  teleology: string // What it's ultimately for
}

/**
 * The resentments of the repository - what it hates and defines itself against
 */
export interface GlossaryResentments {
  hates: string[] // What it explicitly despises
  definesAgainst: string[] // What it exists in opposition to
  allergies: string[] // What makes it uncomfortable
  warnings: string[] // What it warns against
  enemies: string[] // Conceptual enemies it fights
}

/**
 * A complete repository glossary
 */
export interface RepoGlossaryData {
  terms: GlossaryTerm[]
  empirics: GlossaryEmpirics
  psychology: GlossaryPsychology
  poetics: GlossaryPoetics
  philosophy: GlossaryPhilosophy
  resentments: GlossaryResentments
  futureVision: string
  confidence: number
}

// ============================================================================
// ZOD SCHEMAS FOR LLM EXTRACTION
// ============================================================================

const GlossaryTermSchema = z.object({
  term: z.string().describe('A significant word or phrase in this codebase'),
  definition: z.string().describe('What this term means in the context of this repository'),
  context: z.string().describe('Where and how this term is used'),
  emotionalValence: z
    .enum(['positive', 'negative', 'neutral', 'sacred', 'profane'])
    .describe('The emotional charge of this term'),
  frequency: z
    .enum(['ubiquitous', 'common', 'rare', 'once'])
    .describe('How often this term appears'),
})

const GlossaryEmpiricsSchema = z.object({
  measures: z.array(z.string()).describe('What this repository measures or counts'),
  evidenceTypes: z.array(z.string()).describe('What it considers proof or evidence'),
  truthClaims: z.array(z.string()).describe('Assertions it makes about reality'),
  uncertainties: z.array(z.string()).describe('What it admits not knowing'),
})

const GlossaryPsychologySchema = z.object({
  fears: z.array(z.string()).describe('What threatens the existence or purpose of this code'),
  confidences: z.array(z.string()).describe('Where this code feels sure of itself'),
  defenses: z.array(z.string()).describe('How this code protects itself from failure'),
  attachments: z.array(z.string()).describe('Patterns or approaches it cannot let go of'),
  blindSpots: z.array(z.string()).describe('What this code refuses to see or acknowledge'),
})

const GlossaryPoeticsSchema = z.object({
  metaphors: z
    .array(z.string())
    .describe('Structural metaphors that shape this codebase (building, flow, tree, etc)'),
  namingPatterns: z.array(z.string()).describe('Patterns in how things are named'),
  aesthetic: z.string().describe('The sense of beauty this code aspires to'),
  rhythm: z.string().describe('The tempo of this code (fast/slow, dense/sparse)'),
  voice: z.string().describe('How this code speaks (formal, casual, urgent, playful)'),
})

const GlossaryPhilosophySchema = z.object({
  beliefs: z.array(z.string()).describe('Core axioms this code takes for granted'),
  assumptions: z.array(z.string()).describe('Unstated assumptions baked into the design'),
  virtues: z.array(z.string()).describe('What this code considers good and praiseworthy'),
  epistemology: z.string().describe('How this code knows what it knows'),
  ontology: z.string().describe('What entities this code believes exist'),
  teleology: z.string().describe('The ultimate purpose this code serves'),
})

const GlossaryResenmentsSchema = z.object({
  hates: z.array(z.string()).describe('What this code explicitly despises'),
  definesAgainst: z.array(z.string()).describe('What this code exists in opposition to'),
  allergies: z.array(z.string()).describe('Things that make this code uncomfortable'),
  warnings: z.array(z.string()).describe('What this code warns against'),
  enemies: z.array(z.string()).describe('Conceptual enemies this code fights'),
})

const FullGlossarySchema = z.object({
  terms: z.array(GlossaryTermSchema).describe('5-15 significant terms in this repository'),
  empirics: GlossaryEmpiricsSchema,
  psychology: GlossaryPsychologySchema,
  poetics: GlossaryPoeticsSchema,
  philosophy: GlossaryPhilosophySchema,
  resentments: GlossaryResenmentsSchema,
  futureVision: z
    .string()
    .describe(
      'What would a historian in the year 2500 write about this repository? What would be remembered?',
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in this analysis (0-1). Lower if source material is sparse.'),
})

// ============================================================================
// EXTRACTION PROMPTS
// ============================================================================

const GLOSSARY_SYSTEM_PROMPT = `You are a historian from the year 2500, writing an entry for the Encyclopedia of Lost Technologies.

You are analyzing a software repository from the early 21st century. Your task is to create a GLOSSARY for this repository - not a technical glossary, but a cultural one.

What vocabulary would a reader need to understand not just what this code DOES, but what it BELIEVED, what it FEARED, what it RESENTED?

Think like an anthropologist studying an ancient culture through its artifacts:

TERMS: What words carry special meaning? What jargon has emotional weight?

EMPIRICS: What does it measure? What counts as evidence? What truths does it claim?

PSYCHOLOGY: What threatens it? What gives it confidence? What are its blind spots?

POETICS: What metaphors structure its thinking? What aesthetic does it pursue?

PHILOSOPHY: What does it believe about software? About developers? About truth?

RESENTMENTS: What does it hate? What is it fighting against? What enemy defines it?

Be specific. Be poetic. Be honest about uncertainty.
If source material is sparse, acknowledge this and lower confidence accordingly.`

function buildGlossaryPrompt(
  fullName: string,
  readme: string | null,
  packageJson: { description?: string; keywords?: string[]; name?: string } | null,
  sampleCode: string | null,
): string {
  let prompt = `## Repository: ${fullName}\n\n`

  if (packageJson?.description) {
    prompt += `**Package Description**: ${packageJson.description}\n\n`
  }

  if (packageJson?.keywords?.length) {
    prompt += `**Keywords**: ${packageJson.keywords.join(', ')}\n\n`
  }

  if (readme) {
    const readmeExcerpt = readme.slice(0, 4000)
    prompt += `**README**:\n${readmeExcerpt}\n\n`
  }

  if (sampleCode) {
    prompt += `**Sample Code** (representative excerpts):\n\`\`\`\n${sampleCode}\n\`\`\`\n\n`
  }

  prompt += `---

Create a comprehensive glossary for this repository. Consider:

1. What VOCABULARY would future historians need to understand this code?
2. What EMOTIONAL POSTURE did its authors take?
3. What WAR was this code fighting? Against what enemy?
4. What BEAUTY did it aspire to?
5. What would be LOST if this code disappeared?

Remember: You are writing for the year 2500. What would they need to know?`

  return prompt
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

async function getPackageJson(
  repoId: string,
): Promise<{ description?: string; keywords?: string[]; name?: string } | null> {
  const packageFile = await db.file.findFirst({
    where: {
      repoId,
      path: 'package.json',
    },
    select: { content: true },
  })

  if (!packageFile?.content) return null

  try {
    return JSON.parse(packageFile.content)
  } catch {
    return null
  }
}

async function getSampleCode(repoId: string): Promise<string | null> {
  // Get a few representative source files
  const files = await db.file.findMany({
    where: {
      repoId,
      content: { not: null },
      skippedReason: null,
      OR: [
        { path: { endsWith: '.ts' } },
        { path: { endsWith: '.tsx' } },
        { path: { endsWith: '.js' } },
        { path: { endsWith: '.py' } },
        { path: { endsWith: '.go' } },
        { path: { endsWith: '.rs' } },
      ],
    },
    select: { path: true, content: true },
    take: 5,
    orderBy: { path: 'asc' },
  })

  if (files.length === 0) return null

  // Take first 500 chars of each file
  const samples = files
    .filter((f) => f.content)
    .map((f) => `// ${f.path}\n${f.content!.slice(0, 500)}`)
    .join('\n\n---\n\n')

  return samples.slice(0, 3000)
}

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Extract a glossary for a repository
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
      return existing as unknown as RepoGlossaryData
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

  // Gather source material
  const [readme, packageJson, sampleCode] = await Promise.all([
    getReadmeContent(repoId),
    getPackageJson(repoId),
    getSampleCode(repoId),
  ])

  // Check if we have enough content
  const totalContent =
    (readme?.length || 0) + (packageJson?.description?.length || 0) + (sampleCode?.length || 0)

  if (totalContent < 200) {
    logger.info(
      { repoId, fullName: repo.fullName, totalContent },
      'Not enough content for glossary',
    )

    await db.repoGlossary.update({
      where: { repoId },
      data: {
        status: GlossaryStatus.UNGLOSSABLE,
        unglossableReason: `Insufficient content (${totalContent} chars). Some repositories don't have souls.`,
      },
    })

    return null
  }

  try {
    const prompt = buildGlossaryPrompt(repo.fullName, readme, packageJson, sampleCode)

    const { object: glossary } = await generateObject({
      model: openai('gpt-4o'),
      schema: FullGlossarySchema,
      system: GLOSSARY_SYSTEM_PROMPT,
      prompt,
    })

    // Store the glossary
    await db.repoGlossary.update({
      where: { repoId },
      data: {
        status: GlossaryStatus.COMPLETE,
        terms: glossary.terms as unknown as object,
        empirics: glossary.empirics as unknown as object,
        psychology: glossary.psychology as unknown as object,
        poetics: glossary.poetics as unknown as object,
        philosophy: glossary.philosophy as unknown as object,
        resentments: glossary.resentments as unknown as object,
        futureVision: glossary.futureVision,
        confidence: glossary.confidence,
        extractedAt: new Date(),
      },
    })

    logger.info(
      {
        repoId,
        fullName: repo.fullName,
        termCount: glossary.terms.length,
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

  return {
    terms: glossary.terms as unknown as GlossaryTerm[],
    empirics: glossary.empirics as unknown as GlossaryEmpirics,
    psychology: glossary.psychology as unknown as GlossaryPsychology,
    poetics: glossary.poetics as unknown as GlossaryPoetics,
    philosophy: glossary.philosophy as unknown as GlossaryPhilosophy,
    resentments: glossary.resentments as unknown as GlossaryResentments,
    futureVision: glossary.futureVision || '',
    confidence: glossary.confidence || 0,
  }
}
