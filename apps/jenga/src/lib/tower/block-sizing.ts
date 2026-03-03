import type { BlockDimensions } from '@/types/tower'

// Real Jenga-inspired proportions: height:width:length ≈ 1:1.67:5
// But width varies per block based on importance
const BLOCK_HEIGHT = 0.3
const BLOCK_LENGTH = 1.5 // long axis (depth in geometry terms)
const ROW_WIDTH = 1.5 // total width a row of 3 blocks spans (= BLOCK_LENGTH for square footprint)
const VISUAL_GAP = 0.02 // tiny gap between blocks in a row

const MIN_WIDTH_RATIO = 0.12 // smallest block can be 12% of row width
const MAX_WIDTH_RATIO = 0.55 // largest block can be 55% of row width

/**
 * Compute widths for a row of blocks so they fill ROW_WIDTH exactly.
 * Each block's width is proportional to its "weight" (dependentCount).
 * XKCD blocks get minimum width to emphasize the comic effect.
 */
export function computeRowWidths(weights: number[], isXkcd: boolean[]): number[] {
  const n = weights.length
  if (n === 0) return []

  const usableWidth = ROW_WIDTH - (n - 1) * VISUAL_GAP
  const minWidth = usableWidth * MIN_WIDTH_RATIO
  const maxWidth = usableWidth * MAX_WIDTH_RATIO

  // Start with proportional allocation
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1
  const rawWidths = weights.map((w) => (w / totalWeight) * usableWidth)

  // Force XKCD blocks to minimum
  for (let i = 0; i < n; i++) {
    if (isXkcd[i]) rawWidths[i] = minWidth * 0.7
  }

  // Clamp and redistribute
  const widths = [...rawWidths]
  let iterations = 0
  while (iterations < 10) {
    let excess = 0
    let flexCount = 0

    for (let i = 0; i < n; i++) {
      const w = widths[i]!
      if (isXkcd[i]) continue
      if (w < minWidth) {
        excess += minWidth - w
        widths[i] = minWidth
      } else if (w > maxWidth) {
        excess -= w - maxWidth
        widths[i] = maxWidth
      } else {
        flexCount++
      }
    }

    if (Math.abs(excess) < 0.001 || flexCount === 0) break

    // Redistribute excess among flexible blocks
    const perBlock = excess / flexCount
    for (let i = 0; i < n; i++) {
      const w = widths[i]!
      if (!isXkcd[i] && w > minWidth && w < maxWidth) {
        widths[i] = w - perBlock
      }
    }
    iterations++
  }

  // Final normalization: scale all to fit exactly usableWidth
  const currentTotal = widths.reduce((a, b) => a + b, 0)
  if (currentTotal > 0) {
    const scale = usableWidth / currentTotal
    for (let i = 0; i < n; i++) {
      widths[i] = widths[i]! * scale
    }
  }

  return widths.map((w) => Math.round(w * 1000) / 1000)
}

/**
 * Create block dimensions with a specific computed width.
 */
export function makeBlockDimensions(width: number): BlockDimensions {
  return {
    width,
    height: BLOCK_HEIGHT,
    depth: BLOCK_LENGTH,
  }
}

export { BLOCK_HEIGHT, BLOCK_LENGTH, ROW_WIDTH, VISUAL_GAP }
