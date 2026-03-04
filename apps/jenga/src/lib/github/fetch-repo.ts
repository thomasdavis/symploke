interface PackageJsonResult {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
  name: string
  version: string
}

export class RepoError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = 'RepoError'
  }
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'symploke-jenga',
  }
  if (process.env.GITHUB_PAT) {
    headers.Authorization = `Bearer ${process.env.GITHUB_PAT}`
  }
  return headers
}

/**
 * Check that the repo exists and is public before trying to fetch package.json.
 */
async function checkRepoAccessible(owner: string, repo: string): Promise<void> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: githubHeaders(),
    next: { revalidate: 2592000 },
  })

  if (res.status === 404) {
    throw new RepoError(
      `Repository "${owner}/${repo}" not found. It may be private or doesn't exist. Only public repositories are supported.`,
      404,
    )
  }
  if (res.status === 403) {
    throw new RepoError('GitHub rate limit exceeded. Try again later.', 429)
  }
  if (!res.ok) {
    throw new RepoError(`GitHub API error: ${res.status}`, 502)
  }
}

/**
 * Fetch package.json from a public GitHub repo via the Contents API.
 * Checks repo accessibility first, then fetches package.json separately
 * so we can give clear error messages.
 */
export async function fetchPackageJson(owner: string, repo: string): Promise<PackageJsonResult> {
  // First verify the repo exists and is accessible
  await checkRepoAccessible(owner, repo)

  // Now fetch package.json specifically
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/package.json`
  const headers = { ...githubHeaders(), Accept: 'application/vnd.github.v3.raw' }

  const res = await fetch(url, { headers, next: { revalidate: 2592000 } })

  if (!res.ok) {
    if (res.status === 404) {
      throw new RepoError(
        `No package.json found in the root of "${owner}/${repo}". Jenga only works with JavaScript/TypeScript projects that have a package.json in their root directory.`,
        422,
      )
    }
    if (res.status === 403) {
      throw new RepoError('GitHub rate limit exceeded. Try again later.', 429)
    }
    throw new RepoError(`GitHub API error: ${res.status}`, 502)
  }

  let pkg: Record<string, unknown>
  try {
    pkg = await res.json()
  } catch {
    throw new RepoError(`The package.json in "${owner}/${repo}" is not valid JSON.`, 422)
  }

  return {
    dependencies: (pkg.dependencies as Record<string, string>) ?? {},
    devDependencies: (pkg.devDependencies as Record<string, string>) ?? {},
    peerDependencies: (pkg.peerDependencies as Record<string, string>) ?? {},
    name: (pkg.name as string) ?? `${owner}/${repo}`,
    version: (pkg.version as string) ?? '0.0.0',
  }
}
