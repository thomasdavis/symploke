/**
 * Repository Profiler
 *
 * Extracts the conceptual model of a repository from its README and package.json.
 * This is Stage 0 of weave discovery - understanding what each repo IS and DOES.
 */

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { db } from '@symploke/db'
import { logger } from '@symploke/logger'
import {
  CAPABILITIES,
  ARTIFACTS,
  DOMAINS,
  ROLES,
  type RepoProfile,
  type Capability,
  type Artifact,
  type Domain,
  type Role,
} from './ontology'

/**
 * Zod schema for LLM extraction
 */
const RepoProfileSchema = z.object({
  purpose: z
    .string()
    .describe('One sentence describing what this repository does and why it exists'),
  capabilities: z
    .array(z.enum(CAPABILITIES))
    .describe('What this repository CAN DO - its core capabilities'),
  producesArtifacts: z
    .array(z.enum(ARTIFACTS))
    .describe('What artifacts this repository PRODUCES/OUTPUTS'),
  consumesArtifacts: z
    .array(z.enum(ARTIFACTS))
    .describe('What artifacts this repository CONSUMES/REQUIRES as input'),
  domains: z.array(z.enum(DOMAINS)).describe('What problem domains this repository operates in'),
  roles: z
    .array(z.enum(ROLES))
    .describe('What roles this repository plays in a development workflow'),
  keywords: z.array(z.string()).describe('Key technical terms and concepts from the repository'),
  problemsSolved: z.array(z.string()).describe('Specific problems this repository helps solve'),
  targetUsers: z
    .array(z.string())
    .describe('Who would use this repository (e.g., "frontend developers", "DevOps engineers")'),
  confidence: z.number().min(0).max(1).describe('How confident are you in this analysis (0-1)'),
})

type ExtractedProfile = z.infer<typeof RepoProfileSchema>

/**
 * Extract README content from a repository's files
 */
async function getReadmeContent(repoId: string): Promise<string | null> {
  const readmeFile = await db.file.findFirst({
    where: {
      repoId,
      path: {
        in: ['README.md', 'readme.md', 'Readme.md', 'README', 'readme'],
      },
    },
    select: { content: true },
  })

  return readmeFile?.content || null
}

/**
 * Extract package.json content from a repository's files
 */
async function getPackageJson(repoId: string): Promise<{
  description?: string
  keywords?: string[]
  name?: string
} | null> {
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

/**
 * Get directory structure overview
 */
async function getDirectoryStructure(repoId: string): Promise<string> {
  const files = await db.file.findMany({
    where: { repoId },
    select: { path: true },
    orderBy: { path: 'asc' },
  })

  // Get unique top-level directories
  const dirs = new Set<string>()
  files.forEach((f) => {
    const parts = f.path.split('/')
    if (parts.length > 1 && parts[0]) {
      dirs.add(parts[0])
    }
  })

  return Array.from(dirs).slice(0, 20).join(', ')
}

/**
 * Profile a single repository using LLM
 */
export async function profileRepository(repoId: string): Promise<RepoProfile | null> {
  const repo = await db.repo.findUnique({
    where: { id: repoId },
    select: { id: true, name: true, fullName: true },
  })

  if (!repo) {
    logger.warn({ repoId }, 'Repository not found for profiling')
    return null
  }

  logger.info({ repoId, fullName: repo.fullName }, 'Profiling repository')

  // Gather source data
  const [readme, packageJson, dirStructure] = await Promise.all([
    getReadmeContent(repoId),
    getPackageJson(repoId),
    getDirectoryStructure(repoId),
  ])

  // Build context for LLM
  const context = buildContextPrompt(repo.fullName, readme, packageJson, dirStructure)

  if (!readme && !packageJson?.description) {
    logger.warn({ repoId }, 'No README or package.json description found, using minimal context')
  }

  try {
    const { object: extracted } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: RepoProfileSchema,
      system: `You are an expert software architect analyzing repositories.
Your job is to understand what a repository DOES, not what its code looks like.
Focus on:
- The repository's PURPOSE (why does it exist?)
- Its CAPABILITIES (what can it do?)
- Its INPUTS and OUTPUTS (what does it consume and produce?)
- Its ROLE in a development workflow
- Its DOMAIN (what problem space does it operate in?)

CRITICAL: You MUST ONLY use values from the provided enum lists. Do not invent new values.
- For roles: ONLY use producer, consumer, analyzer, validator, orchestrator, transformer, renderer, compiler, library, application, framework, plugin, utility
- For artifacts: ONLY use components, tools, schemas, documents, configurations, embeddings, events, workflows, source_code, packages, apis, reports, templates, types, tests, data, models, prompts
- For capabilities: ONLY use the provided enum values
- For domains: ONLY use the provided enum values

Be specific and concrete. Avoid vague descriptions.
If the information is limited, make reasonable inferences but lower your confidence score.`,
      prompt: context,
    })

    const profile: RepoProfile = {
      repoId: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      purpose: extracted.purpose,
      capabilities: extracted.capabilities as Capability[],
      artifacts: {
        produces: extracted.producesArtifacts as Artifact[],
        consumes: extracted.consumesArtifacts as Artifact[],
      },
      domains: extracted.domains as Domain[],
      roles: extracted.roles as Role[],
      keywords: extracted.keywords,
      problemsSolved: extracted.problemsSolved,
      targetUsers: extracted.targetUsers,
      readmeExcerpt: readme?.slice(0, 500) || '',
      packageDescription: packageJson?.description || '',
      confidence: extracted.confidence,
    }

    logger.info(
      {
        repoId,
        fullName: repo.fullName,
        purpose: profile.purpose,
        capabilities: profile.capabilities,
        roles: profile.roles,
        confidence: profile.confidence,
      },
      'Repository profiled successfully',
    )

    return profile
  } catch (error) {
    logger.error({ error, repoId }, 'Failed to profile repository')
    return null
  }
}

/**
 * Build the context prompt for the LLM
 */
function buildContextPrompt(
  fullName: string,
  readme: string | null,
  packageJson: { description?: string; keywords?: string[]; name?: string } | null,
  dirStructure: string,
): string {
  let prompt = `Analyze this repository: ${fullName}\n\n`

  if (packageJson?.description) {
    prompt += `## Package Description\n${packageJson.description}\n\n`
  }

  if (packageJson?.keywords?.length) {
    prompt += `## Package Keywords\n${packageJson.keywords.join(', ')}\n\n`
  }

  if (readme) {
    // Take first 3000 chars of README - usually contains the important stuff
    const readmeExcerpt = readme.slice(0, 3000)
    prompt += `## README Content\n${readmeExcerpt}\n\n`
  }

  if (dirStructure) {
    prompt += `## Directory Structure\nTop-level directories: ${dirStructure}\n\n`
  }

  prompt += `Based on the above information, analyze this repository's conceptual profile.
What does it DO? What is its PURPOSE? What role does it play?

Remember the ontology options:
- Capabilities: ${CAPABILITIES.join(', ')}
- Artifact types: ${ARTIFACTS.join(', ')}
- Domains: ${DOMAINS.join(', ')}
- Roles: ${ROLES.join(', ')}`

  return prompt
}

/**
 * Profile all repositories in a plexus
 */
export async function profilePlexusRepos(plexusId: string): Promise<RepoProfile[]> {
  const repos = await db.repo.findMany({
    where: { plexusId },
    select: { id: true, fullName: true },
  })

  logger.info({ plexusId, repoCount: repos.length }, 'Profiling all repositories in plexus')

  const profiles: RepoProfile[] = []

  for (const repo of repos) {
    const profile = await profileRepository(repo.id)
    if (profile) {
      profiles.push(profile)
    }
  }

  logger.info(
    { plexusId, profiledCount: profiles.length, totalRepos: repos.length },
    'Plexus profiling complete',
  )

  return profiles
}
