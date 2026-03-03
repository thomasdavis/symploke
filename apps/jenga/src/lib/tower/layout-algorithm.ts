import type { DependencyGraph, DependencyNode } from '@/types/dependency'
import type { BlockData, TowerLayout } from '@/types/tower'
import { BLOCK_HEIGHT, calculateBlockDimensions, ROW_WIDTH } from './block-sizing'
import { categoryToHex } from './color-map'

const MAX_BLOCKS = 54 // 18 levels x 3 per level
const BLOCKS_PER_LEVEL = 3
const GAP = 0.05

/**
 * Convert a dependency graph into a Jenga tower layout.
 * Most critical deps at the bottom. Levels alternate 90deg.
 * Identifies the XKCD block (high dependentCount / popularity ratio).
 */
export function buildTowerLayout(graph: DependencyGraph): TowerLayout {
  let nodes = [...graph.nodes]
  const maxDependentCount = Math.max(...nodes.map((n) => n.dependentCount), 1)

  // Find the XKCD block: highest criticality-to-popularity ratio
  // (the tiny package that holds everything up)
  let xkcdNode: DependencyNode | null = null
  let bestXkcdScore = 0
  for (const node of nodes) {
    if (node.dependentCount >= 2) {
      const score = node.dependentCount / Math.max(node.weeklyDownloads, 1)
      if (score > bestXkcdScore) {
        bestXkcdScore = score
        xkcdNode = node
      }
    }
  }

  // Cap at MAX_BLOCKS - group excess into "N more" blocks
  let grouped: DependencyNode[] = []
  if (nodes.length > MAX_BLOCKS) {
    grouped = nodes.slice(MAX_BLOCKS - 1)
    nodes = nodes.slice(0, MAX_BLOCKS - 1)
  }

  const blocks: BlockData[] = []
  let _blockIndex = 0

  // Place blocks level by level, most critical at bottom
  const totalLevels = Math.ceil((nodes.length + (grouped.length > 0 ? 1 : 0)) / BLOCKS_PER_LEVEL)

  for (let level = 0; level < totalLevels; level++) {
    const isRotated = level % 2 === 1
    const y = level * (BLOCK_HEIGHT + GAP)

    for (let i = 0; i < BLOCKS_PER_LEVEL; i++) {
      const nodeIndex = level * BLOCKS_PER_LEVEL + i

      // Check if this is the grouped "N more" block
      if (grouped.length > 0 && nodeIndex === nodes.length) {
        const dim = calculateBlockDimensions(0, maxDependentCount, false)
        const pos = getBlockPosition(i, BLOCKS_PER_LEVEL, dim.width, y, isRotated)

        blocks.push({
          id: `grouped-${level}-${i}`,
          dependency: {
            name: `${grouped.length} more...`,
            version: '',
            depth: 999,
            category: 'other',
            dependentCount: 0,
            transitiveSize: 0,
            criticality: 0,
            weeklyDownloads: 0,
            lastPublished: null,
            description: `${grouped.length} additional dependencies`,
            maintainers: 0,
            isDirectDep: false,
            depType: 'prod',
          },
          position: { x: pos.x, y: pos.y, z: pos.z, rotationY: isRotated ? Math.PI / 2 : 0 },
          dimensions: dim,
          level,
          indexInLevel: i,
          color: '#8899aa',
          isXkcdBlock: false,
          isGrouped: true,
          groupedNames: grouped.map((n) => n.name),
        })
        continue
      }

      const node = nodes[nodeIndex]
      if (!node) break

      const isXkcd = xkcdNode !== null && node.name === xkcdNode.name
      const dim = calculateBlockDimensions(node.dependentCount, maxDependentCount, isXkcd)
      const pos = getBlockPosition(i, BLOCKS_PER_LEVEL, dim.width, y, isRotated)

      blocks.push({
        id: `block-${node.name}`,
        dependency: node,
        position: { x: pos.x, y: pos.y, z: pos.z, rotationY: isRotated ? Math.PI / 2 : 0 },
        dimensions: dim,
        level,
        indexInLevel: i,
        color: categoryToHex(node.category),
        isXkcdBlock: isXkcd,
        isGrouped: false,
      })

      _blockIndex++
    }
  }

  return {
    blocks,
    levels: totalLevels,
    totalHeight: totalLevels * (BLOCK_HEIGHT + GAP),
    xkcdBlockId: xkcdNode ? `block-${xkcdNode.name}` : null,
  }
}

function getBlockPosition(
  index: number,
  total: number,
  _blockWidth: number,
  y: number,
  isRotated: boolean,
): { x: number; y: number; z: number } {
  // Space blocks evenly across the row width
  const spacing = ROW_WIDTH / total
  const offset = (index - (total - 1) / 2) * spacing

  if (isRotated) {
    return { x: 0, y, z: offset }
  }
  return { x: offset, y, z: 0 }
}
