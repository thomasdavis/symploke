import type { DependencyNode } from './dependency'

export interface BlockPosition {
  x: number
  y: number
  z: number
  rotationY: number
}

export interface BlockDimensions {
  width: number
  height: number
  depth: number
}

export interface BlockData {
  id: string
  dependency: DependencyNode
  position: BlockPosition
  dimensions: BlockDimensions
  level: number
  indexInLevel: number
  color: string
  isXkcdBlock: boolean
  isGrouped: boolean
  groupedNames?: string[]
}

export interface TowerLayout {
  blocks: BlockData[]
  levels: number
  totalHeight: number
  xkcdBlockId: string | null
}
