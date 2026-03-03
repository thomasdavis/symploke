import type { DependencyEdge, DependencyGraph, DependencyNode } from '@/types/dependency'
import { categorize } from './categorizer'
import type { ParsedDependency } from './parser'
import type { ResolvedDep } from './resolver'

/**
 * Build a full dependency graph with metrics from resolved deps.
 */
export function buildDependencyGraph(
  rootPackage: string,
  directDeps: ParsedDependency[],
  resolved: Map<string, ResolvedDep>,
): DependencyGraph {
  const edges: DependencyEdge[] = []
  const dependentCounts = new Map<string, number>()

  // Build edges and count dependents
  // Root -> direct deps
  for (const dep of directDeps) {
    if (resolved.has(dep.name)) {
      edges.push({ from: rootPackage, to: dep.name })
      dependentCounts.set(dep.name, (dependentCounts.get(dep.name) ?? 0) + 1)
    }
  }

  // Transitive edges
  for (const [name, info] of resolved) {
    for (const depName of Object.keys(info.dependencies)) {
      if (resolved.has(depName)) {
        edges.push({ from: name, to: depName })
        dependentCounts.set(depName, (dependentCounts.get(depName) ?? 0) + 1)
      }
    }
  }

  const totalDeps = resolved.size

  // Build nodes
  const nodes: DependencyNode[] = []
  for (const [name, info] of resolved) {
    const dependentCount = dependentCounts.get(name) ?? 0

    // Calculate transitive size (how many deps does this dep bring in)
    const transitiveSize = countTransitiveDeps(name, resolved, new Set())

    const criticality = dependentCount * 2 + transitiveSize + (info.depth === 0 ? 5 : 0)

    nodes.push({
      name,
      version: info.version,
      depth: info.depth,
      category: categorize(name),
      dependentCount,
      transitiveSize,
      criticality,
      weeklyDownloads: info.weeklyDownloads,
      lastPublished: info.lastPublished,
      description: info.description,
      maintainers: info.maintainers,
      isDirectDep: info.isDirectDep,
      depType: info.type,
    })
  }

  // Sort by criticality descending
  nodes.sort((a, b) => b.criticality - a.criticality)

  return {
    nodes,
    edges,
    rootPackage,
    totalDeps,
    resolvedAt: new Date().toISOString(),
  }
}

function countTransitiveDeps(
  name: string,
  resolved: Map<string, ResolvedDep>,
  visited: Set<string>,
): number {
  if (visited.has(name)) return 0
  visited.add(name)

  const info = resolved.get(name)
  if (!info) return 0

  let count = 0
  for (const depName of Object.keys(info.dependencies)) {
    if (resolved.has(depName)) {
      count += 1 + countTransitiveDeps(depName, resolved, visited)
    }
  }

  return count
}
