'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './dashboard.css'

type Repo = {
  id: string
  name: string
  fullName: string
  url: string
  lastIndexed: Date | null
  createdAt: Date
  _count?: {
    files: number
  }
}

type RepoNodeData = {
  repo: Repo
}

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return 'Never'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()

  if (diffMs < 0) return 'Just now'

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes === 1) return '1m ago'
  if (minutes < 60) return `${minutes}m ago`
  if (hours === 1) return '1h ago'
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

function RepoNode({ data }: NodeProps<Node<RepoNodeData>>) {
  const { repo } = data
  const fileCount = repo._count?.files ?? 0
  const isIndexed = repo.lastIndexed !== null

  return (
    <div className={`repo-node ${isIndexed ? 'repo-node--indexed' : 'repo-node--pending'}`}>
      <Handle type="target" position={Position.Top} className="repo-node__handle" />

      <div className="repo-node__header">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="repo-node__icon"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2 5H14" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="repo-node__name">{repo.name}</span>
      </div>

      <div className="repo-node__full-name">{repo.fullName}</div>

      <div className="repo-node__stats">
        <div className="repo-node__stat">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 2C3 1.44772 3.44772 1 4 1H9L13 5V14C13 14.5523 12.5523 15 12 15H4C3.44772 15 3 14.5523 3 14V2Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M9 1V5H13" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span>{fileCount.toLocaleString()} files</span>
        </div>
        <div className="repo-node__stat">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 4V8L10.5 10.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>{formatTimeAgo(repo.lastIndexed)}</span>
        </div>
      </div>

      <div
        className={`repo-node__status ${isIndexed ? 'repo-node__status--success' : 'repo-node__status--pending'}`}
      >
        {isIndexed ? 'Indexed' : 'Not indexed'}
      </div>

      <Handle type="source" position={Position.Bottom} className="repo-node__handle" />
    </div>
  )
}

const nodeTypes = {
  repo: RepoNode,
}

function calculateNodePositions(repos: Repo[]): Node<RepoNodeData>[] {
  const nodeWidth = 240
  const nodeHeight = 160
  const horizontalGap = 60
  const verticalGap = 40
  const nodesPerRow = Math.ceil(Math.sqrt(repos.length))

  return repos.map((repo, index) => {
    const row = Math.floor(index / nodesPerRow)
    const col = index % nodesPerRow

    return {
      id: repo.id,
      type: 'repo',
      position: {
        x: col * (nodeWidth + horizontalGap),
        y: row * (nodeHeight + verticalGap),
      },
      data: { repo },
    }
  })
}

export type RepoFlowGraphProps = {
  repos: Repo[]
  plexusId: string
}

export function RepoFlowGraph({ repos, plexusId }: RepoFlowGraphProps) {
  const initialNodes = useMemo(() => calculateNodePositions(repos), [repos])
  const initialEdges: Edge[] = useMemo(() => [], [])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      window.location.href = `/plexus/${plexusId}/repos/${node.id}`
    },
    [plexusId],
  )

  if (repos.length === 0) {
    return (
      <div className="repo-flow-empty">
        <div className="repo-flow-empty__icon">
          <svg width="48" height="48" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1" />
            <path d="M2 5H14" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
        <h3 className="repo-flow-empty__title">No repositories yet</h3>
        <p className="repo-flow-empty__description">
          Add repositories to see them visualized here.
        </p>
      </div>
    )
  }

  return (
    <div className="repo-flow-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background color="var(--color-border-subtle)" gap={20} size={1} />
        <Controls className="repo-flow-controls" />
        <MiniMap
          className="repo-flow-minimap"
          nodeColor={(node) => {
            const data = node.data as RepoNodeData
            return data.repo.lastIndexed ? 'var(--color-success)' : 'var(--color-fg-muted)'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  )
}
