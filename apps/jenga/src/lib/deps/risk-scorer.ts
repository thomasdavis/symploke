import type { ResolvedDep } from './resolver'

/**
 * Calculate a risk score (0-10) for a dependency based on various signals.
 */
export function calculateRiskScore(
  dep: ResolvedDep,
  dependentCount: number,
  totalDeps: number,
): number {
  let risk = 0

  // High dependent count = high risk if removed
  const depRatio = dependentCount / Math.max(totalDeps, 1)
  risk += depRatio * 4

  // Low maintainers = higher bus factor risk
  if (dep.maintainers <= 1) risk += 2
  else if (dep.maintainers <= 3) risk += 1

  // Old last publish = potentially unmaintained
  if (dep.lastPublished) {
    const monthsSincePublish =
      (Date.now() - new Date(dep.lastPublished).getTime()) / (1000 * 60 * 60 * 24 * 30)
    if (monthsSincePublish > 24) risk += 2
    else if (monthsSincePublish > 12) risk += 1
  } else {
    risk += 1.5
  }

  // Foundation deps are riskier to remove
  if (dep.depth === 0) risk += 1

  return Math.min(10, Math.max(0, Math.round(risk * 10) / 10))
}
