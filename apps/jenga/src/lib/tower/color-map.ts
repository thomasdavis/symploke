import type { DependencyCategory } from '@/types/dependency'

const CATEGORY_COLORS: Record<DependencyCategory, string> = {
  framework: 'oklch(65% 0.18 250)', // blue
  utility: 'oklch(70% 0.18 145)', // green
  testing: 'oklch(75% 0.15 85)', // amber
  build: 'oklch(70% 0.17 55)', // orange
  types: 'oklch(65% 0.18 300)', // purple
  ui: 'oklch(70% 0.17 340)', // pink
  data: 'oklch(70% 0.15 195)', // cyan
  security: 'oklch(65% 0.22 25)', // red
  lint: 'oklch(70% 0.15 175)', // teal
  other: 'oklch(70% 0.05 240)', // neutral gray-blue
}

export function getCategoryColor(category: DependencyCategory): string {
  return CATEGORY_COLORS[category]
}

/**
 * Convert OKLCH string to hex for Three.js
 */
export function categoryToHex(category: DependencyCategory): string {
  const HEX_MAP: Record<DependencyCategory, string> = {
    framework: '#4488dd',
    utility: '#44bb66',
    testing: '#ccaa33',
    build: '#dd8833',
    types: '#9955cc',
    ui: '#cc55aa',
    data: '#44aabb',
    security: '#dd4444',
    lint: '#44aa99',
    other: '#8899aa',
  }
  return HEX_MAP[category]
}
