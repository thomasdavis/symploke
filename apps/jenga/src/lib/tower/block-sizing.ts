import type { BlockDimensions } from '@/types/tower'

const BLOCK_HEIGHT = 0.3
const BLOCK_DEPTH = 0.9 // along the row
const MIN_WIDTH = 0.6
const MAX_WIDTH = 1.2
const ROW_WIDTH = 3.0 // total width of a row of 3 blocks

/**
 * Calculate block dimensions based on importance metrics.
 * Width scales with dependentCount relative to max.
 */
export function calculateBlockDimensions(
  dependentCount: number,
  maxDependentCount: number,
  isXkcdBlock: boolean,
): BlockDimensions {
  if (isXkcdBlock) {
    return { width: MIN_WIDTH * 0.7, height: BLOCK_HEIGHT, depth: BLOCK_DEPTH }
  }

  const ratio = maxDependentCount > 0 ? dependentCount / maxDependentCount : 0.5
  const width = MIN_WIDTH + ratio * (MAX_WIDTH - MIN_WIDTH)

  return {
    width: Math.round(width * 100) / 100,
    height: BLOCK_HEIGHT,
    depth: BLOCK_DEPTH,
  }
}

export { BLOCK_HEIGHT, BLOCK_DEPTH, ROW_WIDTH }
