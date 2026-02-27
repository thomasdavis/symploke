import { Octokit } from '@octokit/rest'
import { logger } from '@symploke/logger'

const GITHUB_PAT = process.env.GITHUB_PAT || process.env.AUTH_GITHUB_TOKEN

function getOctokit(): Octokit {
  return new Octokit({ auth: GITHUB_PAT || undefined })
}

export interface CrawledRepo {
  owner: string
  name: string
  fullName: string
  description: string | null
  topics: string[]
  language: string | null
  stars: number
  readme: string | null
  commits: Array<{ message: string; date: string }>
  pullRequests: Array<{ title: string; body: string | null; state: string }>
  issues: Array<{ title: string; body: string | null; state: string }>
}

export interface CrawledActivity {
  user: {
    login: string
    id: number
    avatarUrl: string
    bio: string | null
    company: string | null
    location: string | null
    blog: string | null
    name: string | null
  }
  repos: CrawledRepo[]
  eventCount: number
}

/**
 * Crawl a GitHub user's public activity and build a raw activity profile
 */
export async function crawlGitHubUser(
  username: string,
  onProgress?: (step: string) => void,
): Promise<CrawledActivity> {
  const octokit = getOctokit()

  // Step 1: Fetch user profile
  onProgress?.('Fetching user profile...')
  logger.info({ username }, 'Fetching GitHub user profile')

  let user: CrawledActivity['user']
  try {
    const { data } = await octokit.users.getByUsername({ username })
    user = {
      login: data.login,
      id: data.id,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      company: data.company,
      location: data.location,
      blog: data.blog,
      name: data.name,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      throw new Error(`GitHub user "${username}" not found`)
    }
    throw error
  }

  // Step 2: Fetch public events (up to 300, paginated)
  onProgress?.('Fetching public activity...')
  logger.info({ username }, 'Fetching public events')

  const events: Array<{ type: string; repo: { name: string }; created_at: string }> = []
  for (let page = 1; page <= 3; page++) {
    try {
      const { data } = await octokit.activity.listPublicEventsForUser({
        username,
        per_page: 100,
        page,
      })
      if (data.length === 0) break
      events.push(
        ...data.map((e) => ({
          type: e.type ?? '',
          repo: { name: e.repo.name },
          created_at: e.created_at ?? '',
        })),
      )
    } catch {
      // Events endpoint can 404 for new or inactive users
      break
    }
  }

  // Step 3: Extract unique repos from events (last 4 weeks)
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  const recentEvents = events.filter((e) => new Date(e.created_at) > fourWeeksAgo)
  const repoFullNames = [...new Set(recentEvents.map((e) => e.repo.name))]

  // If no recent events, fall back to user's own repos
  if (repoFullNames.length === 0) {
    onProgress?.('No recent events, fetching owned repos...')
    try {
      const { data: ownedRepos } = await octokit.repos.listForUser({
        username,
        sort: 'updated',
        per_page: 10,
      })
      repoFullNames.push(...ownedRepos.map((r) => r.full_name))
    } catch {
      // Continue with empty repos
    }
  }

  // Limit to 15 repos to avoid excessive API calls
  const reposToFetch = repoFullNames.slice(0, 15)

  // Step 4: Fetch details for each repo
  onProgress?.(`Analyzing ${reposToFetch.length} repositories...`)
  logger.info({ username, repoCount: reposToFetch.length }, 'Fetching repo details')

  const repos: CrawledRepo[] = []
  for (const fullName of reposToFetch) {
    const [owner, name] = fullName.split('/')
    if (!owner || !name) continue

    try {
      const repo = await crawlRepo(octokit, owner, name, username, fourWeeksAgo)
      repos.push(repo)
    } catch (error) {
      logger.warn({ error, repo: fullName }, 'Failed to crawl repo, skipping')
    }
  }

  onProgress?.('Activity crawl complete')
  logger.info({ username, reposCrawled: repos.length, eventCount: events.length }, 'Crawl complete')

  return {
    user,
    repos,
    eventCount: events.length,
  }
}

async function crawlRepo(
  octokit: Octokit,
  owner: string,
  name: string,
  username: string,
  since: Date,
): Promise<CrawledRepo> {
  // Fetch repo metadata
  const { data: repo } = await octokit.repos.get({ owner, repo: name })

  // Fetch README (truncated)
  let readme: string | null = null
  try {
    const { data: readmeData } = await octokit.repos.getReadme({ owner, repo: name })
    if (readmeData.content && readmeData.encoding === 'base64') {
      const decoded = Buffer.from(readmeData.content, 'base64').toString('utf-8')
      readme = decoded.slice(0, 2000) // Truncate to ~2k chars
    }
  } catch {
    // No README
  }

  // Fetch recent commits by this user
  const commits: Array<{ message: string; date: string }> = []
  try {
    const { data: commitData } = await octokit.repos.listCommits({
      owner,
      repo: name,
      author: username,
      since: since.toISOString(),
      per_page: 20,
    })
    commits.push(
      ...commitData.map((c) => ({
        message: c.commit.message.slice(0, 200),
        date: c.commit.author?.date ?? '',
      })),
    )
  } catch {
    // May fail for empty repos
  }

  // Fetch PRs by this user
  const pullRequests: Array<{ title: string; body: string | null; state: string }> = []
  try {
    const { data: prData } = await octokit.pulls.list({
      owner,
      repo: name,
      state: 'all',
      sort: 'updated',
      per_page: 20,
    })
    const userPRs = prData.filter((pr) => pr.user?.login === username).slice(0, 10)
    pullRequests.push(
      ...userPRs.map((pr) => ({
        title: pr.title,
        body: pr.body?.slice(0, 500) ?? null,
        state: pr.state,
      })),
    )
  } catch {
    // Continue without PRs
  }

  // Fetch issues by this user
  const issues: Array<{ title: string; body: string | null; state: string }> = []
  try {
    const { data: issueData } = await octokit.issues.listForRepo({
      owner,
      repo: name,
      state: 'all',
      sort: 'updated',
      per_page: 20,
      creator: username,
    })
    // Filter out PRs (GitHub API includes PRs in issues endpoint)
    const realIssues = issueData.filter((i) => !i.pull_request).slice(0, 10)
    issues.push(
      ...realIssues.map((i) => ({
        title: i.title,
        body: i.body?.slice(0, 500) ?? null,
        state: i.state,
      })),
    )
  } catch {
    // Continue without issues
  }

  return {
    owner,
    name,
    fullName: `${owner}/${name}`,
    description: repo.description,
    topics: repo.topics ?? [],
    language: repo.language,
    stars: repo.stargazers_count,
    readme,
    commits,
    pullRequests,
    issues,
  }
}
