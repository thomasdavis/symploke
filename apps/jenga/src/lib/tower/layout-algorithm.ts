import type { DependencyGraph, DependencyNode } from '@/types/dependency'
import type { BlockData, TowerLayout } from '@/types/tower'
import {
  BLOCK_HEIGHT,
  ROW_WIDTH,
  VISUAL_GAP,
  computeRowWidths,
  makeBlockDimensions,
} from './block-sizing'
import { getBlockColor } from './color-map'

const MAX_BLOCKS = 54 // 18 levels x 3 per level
const BLOCKS_PER_LEVEL = 3

/**
 * Convert a dependency graph into a Jenga tower layout.
 * Most critical deps at the bottom. Levels alternate 90deg.
 * Block widths vary by importance — each row packs to fill ROW_WIDTH exactly.
 * Identifies the XKCD block (high dependentCount / popularity ratio).
 */
export function buildTowerLayout(graph: DependencyGraph): TowerLayout {
  let nodes = [...graph.nodes]

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

  // Build list of all items to place (nodes + optional grouped block)
  const allItems: Array<{ node: DependencyNode; isGrouped: boolean; groupedNames?: string[] }> =
    nodes.map((n) => ({ node: n, isGrouped: false }))
  if (grouped.length > 0) {
    allItems.push({
      node: {
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
      isGrouped: true,
      groupedNames: grouped.map((n) => n.name),
    })
  }

  const totalLevels = Math.ceil(allItems.length / BLOCKS_PER_LEVEL)
  const blocks: BlockData[] = []

  for (let level = 0; level < totalLevels; level++) {
    const isRotated = level % 2 === 1
    const y = BLOCK_HEIGHT / 2 + level * (BLOCK_HEIGHT + VISUAL_GAP)

    // Gather this level's items
    const levelItems: typeof allItems = []
    for (let i = 0; i < BLOCKS_PER_LEVEL; i++) {
      const idx = level * BLOCKS_PER_LEVEL + i
      const item = allItems[idx]
      if (item) levelItems.push(item)
    }

    // Compute proportional widths for this row
    const weights = levelItems.map((item) => Math.max(item.node.dependentCount, 0.5))
    const xkcdFlags = levelItems.map((item) => !!(xkcdNode && item.node.name === xkcdNode.name))
    const widths = computeRowWidths(weights, xkcdFlags)

    // Position blocks side-by-side, centered on the row
    let cursor = -ROW_WIDTH / 2
    for (let i = 0; i < levelItems.length; i++) {
      const item = levelItems[i]!
      const node = item.node
      const w = widths[i]!
      const dim = makeBlockDimensions(w)
      const isXkcd = xkcdFlags[i] ?? false

      // Block center = cursor + half its width
      const centerOffset = cursor + w / 2
      const pos = isRotated ? { x: 0, y, z: centerOffset } : { x: centerOffset, y, z: 0 }

      blocks.push({
        id: item.isGrouped ? `grouped-${level}-${i}` : `block-${node.name}`,
        dependency: node,
        position: { x: pos.x, y: pos.y, z: pos.z, rotationY: isRotated ? Math.PI / 2 : 0 },
        dimensions: dim,
        level,
        indexInLevel: i,
        color: getBlockColor(node.category, node.name),
        isXkcdBlock: isXkcd,
        isGrouped: item.isGrouped,
        groupedNames: item.groupedNames,
      })

      cursor += w + VISUAL_GAP
    }
  }

  return {
    blocks,
    levels: totalLevels,
    totalHeight: BLOCK_HEIGHT / 2 + totalLevels * (BLOCK_HEIGHT + VISUAL_GAP),
    xkcdBlockId: xkcdNode ? `block-${xkcdNode.name}` : null,
  }
}
