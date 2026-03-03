interface PackageJsonResult {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
  name: string
  version: string
}

/**
 * Fetch package.json from a public GitHub repo via the Contents API.
 */
export async function fetchPackageJson(owner: string, repo: string): Promise<PackageJsonResult> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/package.json`
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3.raw',
    'User-Agent': 'symploke-jenga',
  }

  if (process.env.GITHUB_PAT) {
    headers.Authorization = `Bearer ${process.env.GITHUB_PAT}`
  }

  const res = await fetch(url, { headers, next: { revalidate: 2592000 } })

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('No package.json found in this repository')
    }
    if (res.status === 403) {
      throw new Error('GitHub rate limit exceeded. Try again later.')
    }
    throw new Error(`GitHub API error: ${res.status}`)
  }

  const pkg = await res.json()

  return {
    dependencies: pkg.dependencies ?? {},
    devDependencies: pkg.devDependencies ?? {},
    peerDependencies: pkg.peerDependencies ?? {},
    name: pkg.name ?? `${owner}/${repo}`,
    version: pkg.version ?? '0.0.0',
  }
}
