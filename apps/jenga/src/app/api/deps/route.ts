import { NextResponse } from 'next/server'
import { parseDependencies } from '@/lib/deps/parser'
import { resolveTransitiveDeps } from '@/lib/deps/resolver'
import { buildDependencyGraph } from '@/lib/deps/tree-builder'
import { fetchPackageJson } from '@/lib/github/fetch-repo'
import type { DependencyGraph } from '@/types/dependency'

// In-memory cache with 1-month TTL
const graphCache = new Map<string, { data: DependencyGraph; expiresAt: number }>()
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function POST(request: Request) {
  try {
    const { owner, repo } = await request.json()

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Missing owner or repo' }, { status: 400 })
    }

    const cacheKey = `${owner}/${repo}`
    const cached = graphCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data)
    }

    // Fetch package.json from GitHub
    const pkg = await fetchPackageJson(owner, repo)

    // Parse dependencies
    const directDeps = parseDependencies(pkg)

    if (directDeps.length === 0) {
      return NextResponse.json(
        { error: 'No dependencies found in this package.json' },
        { status: 404 },
      )
    }

    // Resolve transitive deps (depth 3, concurrency 10)
    const resolved = await resolveTransitiveDeps(directDeps, 3, 10)

    // Build graph
    const graph = buildDependencyGraph(pkg.name, directDeps, resolved)

    // Cache for 1 month
    graphCache.set(cacheKey, { data: graph, expiresAt: Date.now() + CACHE_TTL })

    return NextResponse.json(graph)
  } catch (err) {
    // Propagate specific status codes from RepoError
    if (err instanceof Error && 'statusCode' in err) {
      const repoErr = err as Error & { statusCode: number }
      return NextResponse.json({ error: repoErr.message }, { status: repoErr.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Failed to resolve dependencies'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
