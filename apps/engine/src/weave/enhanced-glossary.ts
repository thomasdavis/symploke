/**
 * Enhanced Glossary Extraction - Symploke v2
 *
 * Extracts a technical contract from a repository, not vibes.
 * Uses README + package.json + TODOs + code analysis.
 */

import { openai } from '@ai-sdk/openai'
import { db } from '@symploke/db'
import { logger } from '@symploke/logger'
import { generateObject } from 'ai'
import { type EnhancedGlossary, EnhancedGlossarySchema, type TodoItem } from './types/actionable.js'

// ============================================================================
// DATA GATHERING
// ============================================================================

interface RepoData {
  readme: string | null
  packageJson: Record<string, unknown> | null
  todos: TodoItem[]
  entryFiles: string[]
  fileList: string[]
}

/**
 * Gather all relevant data from a repository
 */
async function gatherRepoData(repoId: string): Promise<RepoData> {
  // Get README
  const readmeFile = await db.file.findFirst({
    where: {
      repoId,
      path: {
        in: ['README.md', 'readme.md', 'Readme.md', 'README', 'readme', 'README.MD'],
      },
    },
    select: { content: true },
  })

  // Get package.json
  const packageJsonFile = await db.file.findFirst({
    where: {
      repoId,
      path: 'package.json',
    },
    select: { content: true },
  })

  let packageJson: Record<string, unknown> | null = null
  if (packageJsonFile?.content) {
    try {
      packageJson = JSON.parse(packageJsonFile.content)
    } catch {
      // Invalid JSON, ignore
    }
  }

  // Find TODO comments in code files
  const codeFiles = await db.file.findMany({
    where: {
      repoId,
      path: {
        endsWith: '.ts',
      },
      NOT: {
        path: {
          contains: 'node_modules',
        },
      },
    },
    select: { path: true, content: true },
    take: 50, // Limit to avoid too much processing
  })

  const todos: TodoItem[] = []
  for (const file of codeFiles) {
    if (!file.content) continue
    const lines = file.content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      // Match TODO, FIXME, HACK, XXX comments
      const todoMatch = line.match(/\/\/\s*(TODO|FIXME|HACK|XXX)[\s:]*(.+)/i)
      if (todoMatch) {
        todos.push({
          file: file.path,
          line: i + 1,
          text: todoMatch[2]?.trim() || '',
        })
      }
    }
  }

  // Get list of entry point files
  const entryFiles = await db.file.findMany({
    where: {
      repoId,
      OR: [
        { path: { endsWith: 'index.ts' } },
        { path: { endsWith: 'index.js' } },
        { path: { endsWith: 'main.ts' } },
        { path: { endsWith: 'main.js' } },
        { path: { contains: 'src/index' } },
        { path: { contains: 'src/main' } },
      ],
      NOT: {
        path: { contains: 'node_modules' },
      },
    },
    select: { path: true },
    take: 10,
  })

  // Get file list for structure understanding
  const allFiles = await db.file.findMany({
    where: {
      repoId,
      NOT: {
        path: { contains: 'node_modules' },
      },
    },
    select: { path: true },
    take: 100,
  })

  return {
    readme: readmeFile?.content || null,
    packageJson,
    todos: todos.slice(0, 20), // Limit TODOs
    entryFiles: entryFiles.map((f) => f.path),
    fileList: allFiles.map((f) => f.path),
  }
}

// ============================================================================
// LLM EXTRACTION PROMPT
// ============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You are analyzing a software repository to extract a TECHNICAL CONTRACT.

DO NOT output generalities or vibes. Output ONLY concrete, evidence-based facts
derived from the README, package.json, file structure, and TODO comments.

Focus on:
1. WHAT this repo provides to others (exports, APIs, packages, functions)
2. WHAT this repo consumes (dependencies, external APIs)
3. WHERE others could integrate (entry points, extension points)
4. WHAT this repo needs (TODOs, limitations, help wanted)

Be SPECIFIC. Reference actual file names, function names, and package names.
If information is not available, use empty arrays - do not invent.`

function buildExtractionPrompt(repoFullName: string, data: RepoData): string {
  const sections: string[] = []

  sections.push(`## Repository: ${repoFullName}`)

  if (data.readme) {
    sections.push(`## README\n${data.readme.slice(0, 6000)}`)
  } else {
    sections.push(`## README\n(No README found)`)
  }

  if (data.packageJson) {
    const pkg = data.packageJson
    const pkgInfo = {
      name: pkg.name,
      description: pkg.description,
      main: pkg.main,
      exports: pkg.exports,
      dependencies: pkg.dependencies ? Object.keys(pkg.dependencies as object) : [],
      devDependencies: pkg.devDependencies ? Object.keys(pkg.devDependencies as object) : [],
      scripts: pkg.scripts ? Object.keys(pkg.scripts as object) : [],
    }
    sections.push(`## package.json\n${JSON.stringify(pkgInfo, null, 2)}`)
  } else {
    sections.push(`## package.json\n(No package.json found)`)
  }

  if (data.todos.length > 0) {
    const todoStr = data.todos.map((t) => `- ${t.file}:${t.line}: ${t.text}`).join('\n')
    sections.push(`## TODO Comments Found\n${todoStr}`)
  }

  if (data.entryFiles.length > 0) {
    sections.push(`## Entry Point Files\n${data.entryFiles.join('\n')}`)
  }

  if (data.fileList.length > 0) {
    sections.push(`## File Structure (sample)\n${data.fileList.slice(0, 30).join('\n')}`)
  }

  sections.push(`
---
Extract the EnhancedGlossary for this repository.
Be concrete and specific. Reference actual names from the data above.`)

  return sections.join('\n\n')
}

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Extract an Enhanced Glossary for a repository
 */
export async function extractEnhancedGlossary(
  repoId: string,
  _options: { force?: boolean } = {},
): Promise<EnhancedGlossary | null> {
  const repo = await db.repo.findUnique({
    where: { id: repoId },
    select: { id: true, fullName: true },
  })

  if (!repo) {
    logger.warn({ repoId }, 'Repository not found for enhanced glossary extraction')
    return null
  }

  logger.info({ repoId, fullName: repo.fullName }, 'Extracting enhanced glossary')

  // Gather all repo data
  const data = await gatherRepoData(repoId)

  // Check if we have enough content
  if (!data.readme && !data.packageJson) {
    logger.info(
      { repoId, fullName: repo.fullName },
      'No README or package.json found, cannot extract enhanced glossary',
    )
    return null
  }

  try {
    const prompt = buildExtractionPrompt(repo.fullName, data)

    const { object: glossary } = await generateObject({
      model: openai('gpt-4o'),
      schema: EnhancedGlossarySchema,
      system: EXTRACTION_SYSTEM_PROMPT,
      prompt,
    })

    // Merge in the TODOs we found (LLM might miss some)
    const mergedGlossary: EnhancedGlossary = {
      ...glossary,
      todos: [...glossary.todos, ...data.todos].slice(0, 20),
    }

    logger.info(
      {
        repoId,
        fullName: repo.fullName,
        exportsCount: glossary.exports.functions.length + glossary.exports.packages.length,
        todosCount: mergedGlossary.todos.length,
        maturity: glossary.maturity,
      },
      'Enhanced glossary extraction complete',
    )

    return mergedGlossary
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(
      { error: message, repoId, fullName: repo.fullName },
      'Enhanced glossary extraction failed',
    )
    return null
  }
}

/**
 * Extract enhanced glossaries for all repos in a plexus
 */
export async function extractPlexusEnhancedGlossaries(
  plexusId: string,
): Promise<Map<string, EnhancedGlossary>> {
  const repos = await db.repo.findMany({
    where: { plexusId },
    select: { id: true, fullName: true },
  })

  logger.info({ plexusId, repoCount: repos.length }, 'Extracting enhanced glossaries for plexus')

  const glossaries = new Map<string, EnhancedGlossary>()

  for (const repo of repos) {
    const glossary = await extractEnhancedGlossary(repo.id)
    if (glossary) {
      glossaries.set(repo.id, glossary)
    }
  }

  logger.info(
    { plexusId, extracted: glossaries.size, total: repos.length },
    'Plexus enhanced glossary extraction complete',
  )

  return glossaries
}
