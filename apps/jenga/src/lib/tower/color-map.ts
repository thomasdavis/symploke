import type { DependencyCategory } from '@/types/dependency'

const CATEGORY_COLORS: Record<DependencyCategory, string> = {
  framework: 'oklch(80% 0.08 250)', // soft blue
  utility: 'oklch(82% 0.08 145)', // soft mint
  testing: 'oklch(85% 0.06 85)', // soft cream
  build: 'oklch(82% 0.07 55)', // soft peach
  types: 'oklch(80% 0.08 300)', // soft lavender
  ui: 'oklch(82% 0.07 340)', // soft pink
  data: 'oklch(82% 0.06 195)', // soft cyan
  security: 'oklch(80% 0.08 25)', // soft coral
  lint: 'oklch(82% 0.06 175)', // soft sage
  other: 'oklch(82% 0.02 80)', // warm beige
}

export function getCategoryColor(category: DependencyCategory): string {
  return CATEGORY_COLORS[category]
}

/**
 * Pastel hex colors for Three.js materials
 */
const HEX_MAP: Record<DependencyCategory, string> = {
  framework: '#b3cce6', // soft blue
  utility: '#b3e0c4', // soft mint
  testing: '#e6ddb3', // soft cream
  build: '#e6ccb3', // soft peach
  types: '#ccb3e6', // soft lavender
  ui: '#e6b3d4', // soft pink
  data: '#b3d9e0', // soft cyan
  security: '#e6b3b3', // soft coral
  lint: '#b3d9cc', // soft sage
  other: '#d4cfc4', // warm beige
}

export function categoryToHex(category: DependencyCategory): string {
  return HEX_MAP[category]
}

/**
 * Simple string hash for deterministic per-block variation.
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Get a per-block color with slight brightness variation (±4%)
 * for a natural wood-like look. Deterministic based on block name.
 */
export function getBlockColor(category: DependencyCategory, blockName: string): string {
  const base = HEX_MAP[category]
  const hash = hashString(blockName)
  // Variation between -0.04 and +0.04
  const variation = ((hash % 80) - 40) / 1000

  // Parse hex and apply variation
  const r = parseInt(base.slice(1, 3), 16)
  const g = parseInt(base.slice(3, 5), 16)
  const b = parseInt(base.slice(5, 7), 16)

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const factor = 1 + variation

  return `#${clamp(r * factor)
    .toString(16)
    .padStart(2, '0')}${clamp(g * factor)
    .toString(16)
    .padStart(2, '0')}${clamp(b * factor)
    .toString(16)
    .padStart(2, '0')}`
}

/**
 * Get per-block roughness variation for natural wood look.
 * Returns value around 0.88 ± 0.07.
 */
export function getBlockRoughness(blockName: string): number {
  const hash = hashString(blockName)
  const variation = ((hash % 140) - 70) / 1000
  return 0.88 + variation
}
