/**
 * Repository Glossary Extraction
 *
 * A Glossary captures what a repository DOES, what it NEEDS, and what it PROVIDES.
 * This enables finding actionable connections like:
 * - "Repo A needs X, Repo B provides X"
 * - "Both repos solve the same problem differently"
 * - "Repo A's output is Repo B's input"
 *
 * Input: README only (simpler, more reliable than parsing code)
 * Output: Structured profile optimized for finding real integrations
 */

import { openai } from '@ai-sdk/openai'
import { db, GlossaryStatus } from '@symploke/db'
import { logger } from '@symploke/logger'
import { generateObject } from 'ai'
import { z } from 'zod'

// ============================================================================
// GLOSSARY TYPES
// ============================================================================

/**
 * A repository glossary profile - focused on finding actionable connections
 */
export interface RepoGlossaryData {
  // WHAT IT IS
  purpose: string // One sentence: what problem does this solve?
  category: string // e.g., "CLI tool", "React component library", "API service", "AI agent"
  domain: string // e.g., "resume/CV", "code transformation", "package management"

  // WHAT IT PROVIDES (outputs others could use)
  provides: string[] // What this repo offers: "JSON schema validation", "PDF generation", "code analysis"
  outputs: string[] // Data/artifacts it produces: "validated JSON", "transformed code", "embeddings"
  apis: string[] // Interfaces it exposes: "REST API", "CLI commands", "npm package", "MCP tools"

  // WHAT IT NEEDS (inputs it could consume)
  consumes: string[] // What it takes as input: "markdown files", "TypeScript code", "JSON data"
  dependencies: string[] // External things it relies on: "OpenAI API", "PostgreSQL", "Node.js"
  gaps: string[] // What it's missing or wants: "better error handling", "more themes", "plugin system"

  // TECHNICAL DETAILS
  techStack: string[] // Languages, frameworks, tools
  patterns: string[] // Architectural patterns: "monorepo", "microservices", "event-driven"

  // BELIEFS (for philosophical alignment)
  values: string[] // What it considers important
  antipatterns: string[] // What it explicitly avoids or fights against

  // META
  confidence: number // 0-1, based on README quality
  summary: string // 2-3 sentence summary
}

// ============================================================================
// ZOD SCHEMAS FOR LLM EXTRACTION
// ============================================================================

const GlossarySchema = z.object({
  // WHAT IT IS
  purpose: z
    .string()
    .describe(
      'One clear sentence: what specific problem does this solve? Be concrete, not generic.',
    ),
  category: z
    .string()
    .describe(
      'What type of software is this? Examples: "CLI tool", "React component library", "API service", "VS Code extension", "AI agent framework", "npm package"',
    ),
  domain: z
    .string()
    .describe(
      'What domain or problem space? Examples: "resume/CV generation", "code transformation", "package management", "file synchronization", "data validation"',
    ),

  // WHAT IT PROVIDES (for others to use)
  provides: z
    .array(z.string())
    .describe(
      'What capabilities does this offer that OTHER projects could use? Be specific: "JSON schema validation", "PDF generation from templates", "AST-based code transformation", "GitHub API wrapper"',
    ),
  outputs: z
    .array(z.string())
    .describe(
      'What data or artifacts does it produce? Examples: "validated JSON objects", "transformed TypeScript files", "vector embeddings", "HTML from markdown"',
    ),
  apis: z
    .array(z.string())
    .describe(
      'What interfaces does it expose? Examples: "REST API endpoints", "CLI commands", "npm package exports", "MCP tool definitions", "React hooks", "GitHub Actions"',
    ),

  // WHAT IT NEEDS (could consume from others)
  consumes: z
    .array(z.string())
    .describe(
      'What does it take as INPUT? Examples: "markdown files", "TypeScript source code", "JSON resume data", "GitHub repository URLs"',
    ),
  dependencies: z
    .array(z.string())
    .describe(
      'What external services or tools does it rely on? Examples: "OpenAI API", "PostgreSQL database", "GitHub API", "Vercel hosting"',
    ),
  gaps: z
    .array(z.string())
    .describe(
      'What is it MISSING or wanting? Look for TODOs, roadmap items, "help wanted", limitations mentioned. Examples: "plugin system", "more themes", "better error messages"',
    ),

  // TECHNICAL
  techStack: z
    .array(z.string())
    .describe('Languages, frameworks, and key libraries: "TypeScript", "React", "Prisma", "Zod"'),
  patterns: z
    .array(z.string())
    .describe(
      'Architectural patterns used: "monorepo", "microservices", "event-driven", "serverless", "MCP server", "CLI with subcommands"',
    ),

  // BELIEFS
  values: z
    .array(z.string())
    .describe(
      'What does it consider important? Examples: "type safety", "developer experience", "performance", "correctness over convenience"',
    ),
  antipatterns: z
    .array(z.string())
    .describe(
      'What does it explicitly avoid or fight against? Examples: "runtime type errors", "vendor lock-in", "magic/implicit behavior"',
    ),

  // META
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence in this analysis (0-1). Lower if README is sparse or marketing-heavy.'),
  summary: z
    .string()
    .describe(
      '2-3 sentences: what it does, who it is for, and what makes it distinctive. Be specific.',
    ),
})

// ============================================================================
// EXTRACTION PROMPTS
// ============================================================================

const GLOSSARY_SYSTEM_PROMPT = `You are analyzing a software repository to understand what it DOES, what it PROVIDES, and what it NEEDS.

Your goal is to enable finding ACTIONABLE connections between repositories:
- "Repo A needs X, Repo B provides X" (supply/demand match)
- "Repo A outputs Y, Repo B consumes Y" (pipeline connection)
- "Both repos work in the same domain" (potential collaboration)
- "Repo A has a gap that Repo B could fill" (integration opportunity)

Focus on CONCRETE, SPECIFIC details:

WHAT IT IS:
- Purpose: What SPECIFIC problem does it solve? Not "helps developers" but "validates JSON resume data against a schema"
- Category: What TYPE of software? CLI tool, library, service, framework, etc.
- Domain: What problem SPACE? Resume generation, code transformation, etc.

WHAT IT PROVIDES (things OTHER repos could use):
- Provides: Specific capabilities - "PDF generation", "schema validation", "code parsing"
- Outputs: What data/artifacts it produces - "validated JSON", "AST nodes", "embeddings"
- APIs: How to consume it - "npm exports", "CLI commands", "REST endpoints", "MCP tools"

WHAT IT NEEDS (things it could get FROM other repos):
- Consumes: What inputs it accepts - "TypeScript files", "JSON data", "URLs"
- Dependencies: External services it relies on - "OpenAI", "GitHub API"
- Gaps: What it's missing - look for TODOs, roadmap, limitations, "help wanted"

TECHNICAL & PHILOSOPHICAL:
- Tech Stack: Languages and frameworks
- Patterns: Architecture patterns - "monorepo", "plugin system", "MCP server"
- Values: What it prioritizes - "type safety", "performance", "DX"
- Antipatterns: What it rejects - "runtime errors", "magic behavior"

BE SPECIFIC. Instead of "improves productivity", say "generates TypeScript types from JSON schemas".
If the README is vague, lower confidence and note gaps.`

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
          // What it is
          purpose: glossary.purpose,
          category: glossary.category,
          domain: glossary.domain,
          // What it provides
          provides: glossary.provides,
          outputs: glossary.outputs,
          apis: glossary.apis,
          // What it needs
          consumes: glossary.consumes,
          dependencies: glossary.dependencies,
          gaps: glossary.gaps,
          // Technical
          techStack: glossary.techStack,
          patterns: glossary.patterns,
        },
        psychology: {},
        poetics: {},
        philosophy: {
          values: glossary.values,
          antipatterns: glossary.antipatterns,
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
        providesCount: glossary.provides.length,
        consumesCount: glossary.consumes.length,
        gapsCount: glossary.gaps.length,
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
  philosophy: unknown
  futureVision: string | null
  confidence: number | null
}): RepoGlossaryData | null {
  try {
    const empirics = record.empirics as Record<string, unknown>
    const philosophy = record.philosophy as Record<string, unknown>

    return {
      // WHAT IT IS
      purpose: (empirics?.purpose as string) || '',
      category: (empirics?.category as string) || '',
      domain: (empirics?.domain as string) || '',

      // WHAT IT PROVIDES
      provides: (empirics?.provides as string[]) || [],
      outputs: (empirics?.outputs as string[]) || [],
      apis: (empirics?.apis as string[]) || [],

      // WHAT IT NEEDS
      consumes: (empirics?.consumes as string[]) || [],
      dependencies: (empirics?.dependencies as string[]) || [],
      gaps: (empirics?.gaps as string[]) || [],

      // TECHNICAL
      techStack: (empirics?.techStack as string[]) || [],
      patterns: (empirics?.patterns as string[]) || [],

      // BELIEFS
      values: (philosophy?.values as string[]) || [],
      antipatterns: (philosophy?.antipatterns as string[]) || [],

      // META
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
