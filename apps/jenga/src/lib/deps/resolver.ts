import { fetchNpmPackage } from '@/lib/npm/registry'
import type { ParsedDependency } from './parser'

export interface ResolvedDep {
  name: string
  version: string
  description: string
  dependencies: Record<string, string>
  weeklyDownloads: number
  lastPublished: string | null
  maintainers: number
  depth: number
  type: 'prod' | 'dev' | 'peer'
  isDirectDep: boolean
}

/**
 * Resolve transitive dependencies to a given depth.
 * Uses concurrency-limited parallel fetching with dedup.
 */
export async function resolveTransitiveDeps(
  directDeps: ParsedDependency[],
  maxDepth = 3,
  concurrency = 10,
): Promise<Map<string, ResolvedDep>> {
  const resolved = new Map<string, ResolvedDep>()
  const queue: { name: string; depth: number; type: 'prod' | 'dev' | 'peer'; isDirect: boolean }[] =
    directDeps.map((d) => ({ name: d.name, depth: 0, type: d.type, isDirect: true }))

  const visited = new Set<string>()

  while (queue.length > 0) {
    // Take a batch
    const batch = queue.splice(0, concurrency).filter((item) => {
      if (visited.has(item.name)) return false
      visited.add(item.name)
      return true
    })

    if (batch.length === 0) continue

    const results = await Promise.all(
      batch.map(async (item) => {
        const info = await fetchNpmPackage(item.name)
        return { item, info }
      }),
    )

    for (const { item, info } of results) {
      resolved.set(item.name, {
        name: info.name,
        version: info.version,
        description: info.description,
        dependencies: info.dependencies,
        weeklyDownloads: info.weeklyDownloads,
        lastPublished: info.lastPublished,
        maintainers: info.maintainers,
        depth: item.depth,
        type: item.type,
        isDirectDep: item.isDirect,
      })

      // Queue transitive deps if under maxDepth
      if (item.depth < maxDepth) {
        for (const depName of Object.keys(info.dependencies)) {
          if (!visited.has(depName)) {
            queue.push({
              name: depName,
              depth: item.depth + 1,
              type: 'prod',
              isDirect: false,
            })
          }
        }
      }
    }
  }

  return resolved
}
