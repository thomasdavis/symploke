/**
 * Repository Dependency Profile Extraction
 *
 * Extracts and compares dependency profiles across repositories to find
 * repos with similar tech stacks. Uses AI to:
 * 1. Identify dependency manifest files (package.json, requirements.txt, etc.)
 * 2. Parse and categorize dependencies
 * 3. Compare profiles and score similarity
 */

import { openai } from '@ai-sdk/openai'
import { db, DependencyProfileStatus } from '@symploke/db'
import { logger } from '@symploke/logger'
import { generateObject } from 'ai'
import { z } from 'zod'
import type {
  DependencyEntry,
  DependencyManifest,
  DependencyProfileMetadata,
  ManifestType,
} from './types/base.js'

// ============================================================================
// ZOD SCHEMAS FOR LLM EXTRACTION
// ============================================================================

const ManifestTypeEnum = z.enum([
  'npm',
  'pip',
  'cargo',
  'go',
  'composer',
  'maven',
  'gradle',
  'gemfile',
  'other',
])

const DependencyCategoryEnum = z.enum([
  'framework',
  'utility',
  'testing',
  'build',
  'database',
  'api',
  'ui',
  'other',
])

/**
 * Schema for AI to identify manifest files from a file list
 */
const ManifestLocatorSchema = z.object({
  manifests: z.array(
    z.object({
      type: ManifestTypeEnum.describe('The package manager type'),
      filePath: z.string().describe('Exact file path from the list'),
      confidence: z.number().describe('0-1 confidence this is a dependency manifest'),
    }),
  ),
})

/**
 * Schema for AI to parse a dependency manifest
 */
const DependencyParseSchema = z.object({
  dependencies: z
    .array(
      z.object({
        name: z.string().describe('Package/library name'),
        version: z.string().optional().describe('Version constraint if specified'),
        category: DependencyCategoryEnum.optional().describe('What kind of dependency is this?'),
      }),
    )
    .describe('Runtime/production dependencies'),
  devDependencies: z
    .array(
      z.object({
        name: z.string().describe('Package/library name'),
        version: z.string().optional().describe('Version constraint if specified'),
        category: DependencyCategoryEnum.optional().describe('What kind of dependency is this?'),
      }),
    )
    .describe('Development-only dependencies'),
  primaryLanguage: z.string().describe('Primary programming language'),
  frameworks: z
    .array(z.string())
    .describe('Major frameworks detected (e.g., React, Express, Django, Rails)'),
})

/**
 * Schema for AI to compare two dependency profiles
 */
const ComparisonSchema = z.object({
  narrative: z
    .string()
    .describe('2-3 sentences explaining how these repos relate based on their dependencies'),
  overlapScore: z
    .number()
    .min(0)
    .max(1)
    .describe('0-1 score of how similar the dependency profiles are'),
  frameworkScore: z
    .number()
    .min(0)
    .max(1)
    .describe('0-1 score of framework alignment (same frameworks = high score)'),
  integrationSuggestions: z
    .array(z.string())
    .describe('Specific suggestions for how these repos could share code or integrate'),
  relationshipType: z
    .enum([
      'same_stack', // nearly identical dependencies
      'complementary', // different but work together well
      'overlapping', // some shared, some different
      'different_ecosystems', // different languages but similar purpose
      'minimal_overlap', // few shared deps
    ])
    .describe('Classification of the relationship'),
})

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Get content of a file by ID
 */
async function getFileContent(fileId: string): Promise<string | null> {
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { content: true },
  })
  return file?.content || null
}

/**
 * Extract dependency profile for a repository
 * Returns cached result if available
 */
export async function extractDependencyProfile(
  repoId: string,
  options: { force?: boolean } = {},
): Promise<DependencyManifest[] | null> {
  const repo = await db.repo.findUnique({
    where: { id: repoId },
    select: { id: true, fullName: true },
  })

  if (!repo) {
    logger.warn({ repoId }, 'Repository not found for dependency extraction')
    return null
  }

  // Check cache first (unless force)
  if (!options.force) {
    const existing = await db.repoDependencyProfile.findUnique({ where: { repoId } })
    if (existing?.status === DependencyProfileStatus.COMPLETE && existing.manifests) {
      logger.debug({ repoId, fullName: repo.fullName }, 'Using cached dependency profile')
      return existing.manifests as unknown as DependencyManifest[]
    }
    if (existing?.status === DependencyProfileStatus.NO_MANIFESTS) {
      logger.debug({ repoId, fullName: repo.fullName }, 'Repo has no manifests (cached)')
      return null
    }
  }

  logger.info({ repoId, fullName: repo.fullName }, 'Extracting dependency profile')

  // Mark as extracting
  await db.repoDependencyProfile.upsert({
    where: { repoId },
    create: { repoId, status: DependencyProfileStatus.EXTRACTING },
    update: { status: DependencyProfileStatus.EXTRACTING, error: null },
  })

  try {
    // Get file list for repo
    const files = await db.file.findMany({
      where: { repoId },
      select: { path: true, id: true },
    })

    if (files.length === 0) {
      await db.repoDependencyProfile.update({
        where: { repoId },
        data: { status: DependencyProfileStatus.NO_MANIFESTS, extractedAt: new Date() },
      })
      return null
    }

    // Ask AI to identify manifest files
    const fileList = files.map((f) => f.path).join('\n')
    const { object: located } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: ManifestLocatorSchema,
      system: `You identify dependency manifest files in codebases.
Common manifest files:
- npm: package.json
- pip: requirements.txt, setup.py, pyproject.toml, Pipfile
- cargo: Cargo.toml
- go: go.mod
- composer: composer.json
- maven: pom.xml
- gradle: build.gradle, build.gradle.kts
- gemfile: Gemfile

Only include files that are actually dependency manifests, not config files.
Ignore lock files (package-lock.json, yarn.lock, Cargo.lock, etc.)`,
      prompt: `Identify dependency manifest files from this file list:\n\n${fileList}`,
    })

    // Filter to high-confidence manifests
    const highConfidenceManifests = located.manifests.filter((m) => m.confidence >= 0.7)

    if (highConfidenceManifests.length === 0) {
      logger.info({ repoId, fullName: repo.fullName }, 'No dependency manifests found')
      await db.repoDependencyProfile.update({
        where: { repoId },
        data: { status: DependencyProfileStatus.NO_MANIFESTS, extractedAt: new Date() },
      })
      return null
    }

    // Parse each manifest
    const manifests: DependencyManifest[] = []
    const allFrameworks: string[] = []

    for (const manifest of highConfidenceManifests) {
      const file = files.find((f) => f.path === manifest.filePath)
      if (!file) {
        logger.warn({ repoId, filePath: manifest.filePath }, 'Manifest file not found in DB')
        continue
      }

      const content = await getFileContent(file.id)
      if (!content) {
        logger.warn({ repoId, filePath: manifest.filePath }, 'Manifest file has no content')
        continue
      }

      try {
        const { object: parsed } = await generateObject({
          model: openai('gpt-4o-mini'),
          schema: DependencyParseSchema,
          system: `You parse dependency manifest files and extract structured dependency information.
Categorize dependencies:
- framework: Core frameworks (React, Express, Django, Rails, etc.)
- ui: UI components (shadcn, tailwind, material-ui, etc.)
- database: Database clients (prisma, sequelize, mongoose, etc.)
- api: HTTP/API libraries (axios, fetch, graphql, etc.)
- testing: Test frameworks (jest, pytest, vitest, etc.)
- build: Build tools (webpack, vite, esbuild, etc.)
- utility: General utilities (lodash, date-fns, etc.)
- other: Everything else`,
          prompt: `Parse this ${manifest.type} manifest file and extract dependencies:\n\n${content.slice(0, 15000)}`,
        })

        manifests.push({
          type: manifest.type as ManifestType,
          filePath: manifest.filePath,
          dependencies: parsed.dependencies as DependencyEntry[],
          devDependencies: parsed.devDependencies as DependencyEntry[],
        })
        allFrameworks.push(...parsed.frameworks)
      } catch (parseError) {
        logger.error(
          { repoId, filePath: manifest.filePath, error: parseError },
          'Failed to parse manifest',
        )
        // Continue with other manifests
      }
    }

    if (manifests.length === 0) {
      await db.repoDependencyProfile.update({
        where: { repoId },
        data: { status: DependencyProfileStatus.NO_MANIFESTS, extractedAt: new Date() },
      })
      return null
    }

    // Calculate summary stats
    const depCount = manifests.reduce((sum, m) => sum + m.dependencies.length, 0)
    const devDepCount = manifests.reduce((sum, m) => sum + m.devDependencies.length, 0)
    const primaryEcosystem = manifests[0]?.type || null
    const uniqueFrameworks = [...new Set(allFrameworks)]

    // Save to database
    await db.repoDependencyProfile.update({
      where: { repoId },
      data: {
        status: DependencyProfileStatus.COMPLETE,
        manifests: manifests as unknown as object,
        primaryEcosystem,
        dependencyCount: depCount,
        devDependencyCount: devDepCount,
        frameworks: uniqueFrameworks,
        extractedAt: new Date(),
      },
    })

    logger.info(
      {
        repoId,
        fullName: repo.fullName,
        manifests: manifests.length,
        deps: depCount,
        devDeps: devDepCount,
        frameworks: uniqueFrameworks,
      },
      'Dependency profile extracted',
    )

    return manifests
  } catch (error) {
    logger.error({ repoId, error }, 'Failed to extract dependency profile')
    await db.repoDependencyProfile.update({
      where: { repoId },
      data: {
        status: DependencyProfileStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    return null
  }
}

// ============================================================================
// COMPARISON
// ============================================================================

/**
 * Compare two dependency profiles and generate a similarity assessment
 */
export async function compareDependencyProfiles(
  sourceRepo: { fullName: string },
  targetRepo: { fullName: string },
  sourceManifests: DependencyManifest[],
  targetManifests: DependencyManifest[],
): Promise<
  Omit<DependencyProfileMetadata, 'sourceManifests' | 'targetManifests' | 'ecosystemMatch'>
> {
  // Calculate raw overlaps
  const sourceDeps = new Set(sourceManifests.flatMap((m) => m.dependencies.map((d) => d.name)))
  const targetDeps = new Set(targetManifests.flatMap((m) => m.dependencies.map((d) => d.name)))
  const sharedDeps = [...sourceDeps].filter((d) => targetDeps.has(d))

  const sourceDevDeps = new Set(
    sourceManifests.flatMap((m) => m.devDependencies.map((d) => d.name)),
  )
  const targetDevDeps = new Set(
    targetManifests.flatMap((m) => m.devDependencies.map((d) => d.name)),
  )
  const sharedDevDeps = [...sourceDevDeps].filter((d) => targetDevDeps.has(d))

  const sourceFrameworks = sourceManifests.flatMap((m) =>
    m.dependencies.filter((d) => d.category === 'framework').map((d) => d.name),
  )
  const targetFrameworks = targetManifests.flatMap((m) =>
    m.dependencies.filter((d) => d.category === 'framework').map((d) => d.name),
  )
  const sharedFrameworks = [...new Set(sourceFrameworks)].filter((f) =>
    targetFrameworks.includes(f),
  )

  // AI assessment
  const { object: comparison } = await generateObject({
    model: openai('gpt-4o'),
    schema: ComparisonSchema,
    system: `You analyze how two repositories' dependencies relate to each other.
Focus on:
- Shared frameworks suggest similar architecture/patterns
- Shared utilities suggest similar coding style
- Complementary deps suggest integration opportunities
- Different ecosystems but similar purposes suggest knowledge sharing opportunities

Be specific about WHY the shared dependencies matter for collaboration.`,
    prompt: `Compare dependency profiles:

${sourceRepo.fullName} dependencies:
${JSON.stringify(
  sourceManifests.map((m) => ({
    type: m.type,
    deps: m.dependencies.map((d) => d.name).slice(0, 30),
  })),
  null,
  2,
)}

${targetRepo.fullName} dependencies:
${JSON.stringify(
  targetManifests.map((m) => ({
    type: m.type,
    deps: m.dependencies.map((d) => d.name).slice(0, 30),
  })),
  null,
  2,
)}

Shared dependencies (${sharedDeps.length}): ${sharedDeps.slice(0, 20).join(', ')}${sharedDeps.length > 20 ? '...' : ''}
Shared frameworks (${sharedFrameworks.length}): ${sharedFrameworks.join(', ')}
Shared dev dependencies (${sharedDevDeps.length}): ${sharedDevDeps.slice(0, 10).join(', ')}`,
  })

  return {
    sharedDependencies: sharedDeps,
    sharedDevDependencies: sharedDevDeps,
    sharedFrameworks,
    overlapScore: comparison.overlapScore,
    frameworkScore: comparison.frameworkScore,
    narrative: comparison.narrative,
    integrationSuggestions: comparison.integrationSuggestions,
    relationshipType: comparison.relationshipType,
  }
}
