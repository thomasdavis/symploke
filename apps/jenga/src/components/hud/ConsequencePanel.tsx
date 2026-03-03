'use client'

import { useMemo } from 'react'
import { useGameStore } from '@/hooks/useGameState'

export function ConsequencePanel() {
  const hoveredBlockId = useGameStore((s) => s.hoveredBlockId)
  const tower = useGameStore((s) => s.tower)
  const graph = useGameStore((s) => s.graph)

  const consequences = useMemo(() => {
    if (!hoveredBlockId || !tower || !graph) return null

    const block = tower.blocks.find((b) => b.id === hoveredBlockId)
    if (!block || block.isGrouped) return null

    const depName = block.dependency.name

    // Find all packages that depend on this one
    const dependents = graph.edges
      .filter((e) => e.to === depName)
      .map((e) => e.from)
      .filter((name) => name !== graph.rootPackage)

    if (dependents.length === 0) return null

    return {
      packageName: depName,
      dependents,
    }
  }, [hoveredBlockId, tower, graph])

  if (!consequences) return null

  return (
    <div className="jenga-consequence">
      <h3>If you remove {consequences.packageName}...</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 8 }}>
        These {consequences.dependents.length} package
        {consequences.dependents.length !== 1 ? 's' : ''} would break:
      </p>
      <ul className="jenga-consequence-list">
        {consequences.dependents.slice(0, 15).map((name) => (
          <li key={name}>{name}</li>
        ))}
        {consequences.dependents.length > 15 && (
          <li style={{ fontStyle: 'italic' }}>...and {consequences.dependents.length - 15} more</li>
        )}
      </ul>
    </div>
  )
}
