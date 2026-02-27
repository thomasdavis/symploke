import { generateObject, generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { logger } from '@symploke/logger'
import type { CrawledActivity, CrawledRepo } from './crawler.js'

export interface RepoSummary {
  repoFullName: string
  summary: string
}

export interface DeveloperProfile {
  profileText: string
  facets: Array<{ title: string; content: string }>
}

/**
 * Pass 1: Generate a per-repo summary of what the user does in this repo
 */
async function summarizeRepo(repo: CrawledRepo, username: string): Promise<string> {
  const commitMessages = repo.commits.map((c) => `- ${c.message}`).join('\n')
  const prTitles = repo.pullRequests.map((pr) => `- ${pr.title}`).join('\n')
  const issueTitles = repo.issues.map((i) => `- ${i.title}`).join('\n')

  const context = [
    `Repository: ${repo.fullName}`,
    repo.description ? `Description: ${repo.description}` : null,
    repo.language ? `Primary language: ${repo.language}` : null,
    repo.topics.length > 0 ? `Topics: ${repo.topics.join(', ')}` : null,
    `Stars: ${repo.stars}`,
    repo.readme ? `README excerpt:\n${repo.readme.slice(0, 1000)}` : null,
    commitMessages ? `Recent commits by ${username}:\n${commitMessages}` : null,
    prTitles ? `Pull requests by ${username}:\n${prTitles}` : null,
    issueTitles ? `Issues by ${username}:\n${issueTitles}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    system: `You are summarizing a developer's activity in a specific repository. Write 2-3 concise sentences describing what ${username} works on in this repo — their role, contributions, and technical focus. Be specific and concrete. Do not use fluff or filler.`,
    prompt: context,
  })

  return text
}

/**
 * Pass 2: Synthesize a full developer profile from per-repo summaries
 */
async function synthesizeProfile(
  username: string,
  userBio: string | null,
  repoSummaries: RepoSummary[],
): Promise<DeveloperProfile> {
  const summaryContext = repoSummaries
    .map((s) => `**${s.repoFullName}**: ${s.summary}`)
    .join('\n\n')

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: z.object({
      profileText: z
        .string()
        .describe(
          'A 3-5 sentence narrative summary of this developer — who they are, what they build, and their technical philosophy.',
        ),
      facets: z
        .array(
          z.object({
            title: z
              .string()
              .describe(
                'A concise label for this facet of the developer (e.g., "Distributed Systems Architect", "Open Source CLI Tooling", "Rust + WebAssembly Ecosystem")',
              ),
            content: z
              .string()
              .describe(
                'A rich paragraph explaining this facet — what they do, how they approach it, and what distinguishes their work in this area.',
              ),
          }),
        )
        .describe(
          'The 3-6 most important facets of this developer. Each facet should capture a distinct dimension of their work. You decide what facets best represent this specific developer.',
        ),
    }),
    system: `You are building a developer profile for ${username} based on their GitHub activity.

Your job is to synthesize a rich, honest, specific profile. Do NOT pad with generic statements. Every sentence should convey something specific about this developer.

The facets you choose should be organic — pick the 3-6 most interesting and distinct aspects of this developer. These might be domain areas, technical philosophies, community roles, or specializations. Each facet title should be short (2-5 words) and descriptive. Each facet content should be a substantive paragraph (3-5 sentences) with specific details.

If the developer doesn't have enough activity to support many facets, use fewer. Quality over quantity.`,
    prompt: [
      userBio ? `GitHub bio: ${userBio}` : null,
      `\nActivity across repositories:\n\n${summaryContext}`,
    ]
      .filter(Boolean)
      .join('\n'),
  })

  return object
}

/**
 * Full hierarchical summarization pipeline
 */
export async function buildDeveloperProfile(
  activity: CrawledActivity,
  onProgress?: (step: string) => void,
): Promise<DeveloperProfile> {
  const { user, repos } = activity

  if (repos.length === 0) {
    return {
      profileText: `${user.login} is a GitHub user with limited public activity.${user.bio ? ` Their bio reads: "${user.bio}"` : ''}`,
      facets: [
        {
          title: 'Early-stage Developer',
          content: `${user.login} has limited public GitHub activity. As they contribute to more open source projects and share their work publicly, their profile will grow richer and more detailed.`,
        },
      ],
    }
  }

  // Pass 1: Per-repo summaries
  onProgress?.(`Summarizing ${repos.length} repositories...`)
  logger.info({ username: user.login, repoCount: repos.length }, 'Starting per-repo summarization')

  const repoSummaries: RepoSummary[] = []
  for (const repo of repos) {
    try {
      const summary = await summarizeRepo(repo, user.login)
      repoSummaries.push({ repoFullName: repo.fullName, summary })
    } catch (error) {
      logger.warn({ error, repo: repo.fullName }, 'Failed to summarize repo')
    }
  }

  if (repoSummaries.length === 0) {
    return {
      profileText: `${user.login} is a GitHub user with public activity across several repositories, but the details could not be summarized.`,
      facets: [
        {
          title: 'Active Developer',
          content: `${user.login} is active on GitHub across ${repos.length} repositories, working with technologies like ${
            repos
              .map((r) => r.language)
              .filter(Boolean)
              .join(', ') || 'various languages'
          }.`,
        },
      ],
    }
  }

  // Pass 2: Profile synthesis
  onProgress?.('Synthesizing developer profile...')
  logger.info({ username: user.login, summaryCount: repoSummaries.length }, 'Synthesizing profile')

  const profile = await synthesizeProfile(user.login, user.bio, repoSummaries)

  logger.info(
    { username: user.login, facetCount: profile.facets.length },
    'Profile synthesis complete',
  )

  return profile
}
