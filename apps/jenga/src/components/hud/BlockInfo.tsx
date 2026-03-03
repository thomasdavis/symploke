'use client'

import { useGameStore } from '@/hooks/useGameState'
import { calculateRiskScore } from '@/lib/deps/risk-scorer'
import { RiskMeter } from './RiskMeter'

export function BlockInfo() {
  const hoveredBlockId = useGameStore((s) => s.hoveredBlockId)
  const tower = useGameStore((s) => s.tower)
  const graph = useGameStore((s) => s.graph)

  if (!hoveredBlockId || !tower || !graph) return null

  const block = tower.blocks.find((b) => b.id === hoveredBlockId)
  if (!block || block.isGrouped) return null

  const dep = block.dependency

  const risk = calculateRiskScore(
    {
      name: dep.name,
      version: dep.version,
      description: dep.description,
      dependencies: {},
      weeklyDownloads: dep.weeklyDownloads,
      lastPublished: dep.lastPublished,
      maintainers: dep.maintainers,
      depth: dep.depth,
      type: dep.depType,
      isDirectDep: dep.isDirectDep,
    },
    dep.dependentCount,
    graph.totalDeps,
  )

  const formatDownloads = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return n.toString()
  }

  return (
    <div className="jenga-block-info">
      <div className="jenga-block-info-name">
        {dep.name}
        {block.isXkcdBlock && <span style={{ color: '#ff4444', marginLeft: 6 }}>XKCD BLOCK</span>}
      </div>
      <div className="jenga-block-info-version">
        v{dep.version} &middot; {dep.category} &middot;{' '}
        {dep.isDirectDep ? 'direct' : `depth ${dep.depth}`}
      </div>
      <div className="jenga-block-info-stats">
        <span className="jenga-block-info-stat">{dep.dependentCount} dependents</span>
        {dep.weeklyDownloads > 0 && (
          <span className="jenga-block-info-stat">{formatDownloads(dep.weeklyDownloads)}/wk</span>
        )}
        <span className="jenga-block-info-stat">
          {dep.maintainers} maintainer{dep.maintainers !== 1 ? 's' : ''}
        </span>
      </div>
      {dep.description && (
        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: 4 }}>
          {dep.description.slice(0, 100)}
        </div>
      )}
      <RiskMeter risk={risk} />
    </div>
  )
}
