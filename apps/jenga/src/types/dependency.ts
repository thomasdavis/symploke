export type DependencyCategory =
  | 'framework'
  | 'utility'
  | 'testing'
  | 'build'
  | 'types'
  | 'ui'
  | 'data'
  | 'security'
  | 'lint'
  | 'other'

export interface DependencyNode {
  name: string
  version: string
  depth: number
  category: DependencyCategory
  dependentCount: number
  transitiveSize: number
  criticality: number
  weeklyDownloads: number
  lastPublished: string | null
  description: string
  maintainers: number
  isDirectDep: boolean
  depType: 'prod' | 'dev' | 'peer'
}

export interface DependencyEdge {
  from: string
  to: string
}

export interface DependencyGraph {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  rootPackage: string
  totalDeps: number
  resolvedAt: string
}
