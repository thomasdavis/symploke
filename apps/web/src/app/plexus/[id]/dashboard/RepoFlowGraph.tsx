'use client'

import type { WeaveType } from '@symploke/db'
import {
  Background,
  Controls,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForceLayout } from '@/hooks/useForceLayout'
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

type Weave = {
  id: string
  sourceRepoId: string
  targetRepoId: string
  type: WeaveType
  title: string
  description: string
  score: number
  sourceRepo: { name: string }
  targetRepo: { name: string }
}

type RepoNodeData = {
  repo: Repo
}

type WeaveEdgeData = {
  weave: Weave
  plexusId: string
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
      {/* Target handles - where edges can connect TO this node */}
      <Handle type="target" position={Position.Top} id="top" className="repo-node__handle" />
      <Handle type="target" position={Position.Left} id="left" className="repo-node__handle" />
      <Handle type="target" position={Position.Right} id="right" className="repo-node__handle" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="repo-node__handle" />

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

      {/* Source handles - where edges can connect FROM this node */}
      <Handle type="source" position={Position.Top} id="top" className="repo-node__handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="repo-node__handle" />
      <Handle type="source" position={Position.Left} id="left" className="repo-node__handle" />
      <Handle type="source" position={Position.Right} id="right" className="repo-node__handle" />
    </div>
  )
}

function WeaveEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<Edge<WeaveEdgeData>>) {
  const [isHovered, setIsHovered] = useState(false)
  const weave = data?.weave

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  })

  if (!weave) return null

  const scorePercent = Math.round(weave.score * 100)

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG group needs hover events for edge highlighting */}
      <g onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {/* Invisible wider path for easier hover */}
        <path id={`${id}-hitarea`} d={edgePath} fill="none" stroke="transparent" strokeWidth={20} />
        {/* Visible edge */}
        <path
          id={id}
          d={edgePath}
          fill="none"
          stroke={isHovered ? 'var(--color-primary)' : 'var(--color-weave-edge)'}
          strokeWidth={isHovered ? 3 : 2}
          markerEnd={markerEnd}
          className="weave-edge__path"
          style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
        />
      </g>
      <EdgeLabelRenderer>
        <button
          type="button"
          className={`weave-edge__label ${isHovered ? 'weave-edge__label--hovered' : ''}`}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <span className="weave-edge__title">{weave.title}</span>
          <span className="weave-edge__score">{scorePercent}%</span>

          {isHovered && (
            <div className="weave-edge__tooltip">
              <div className="weave-edge__tooltip-header">
                <span className="weave-edge__tooltip-title">{weave.title}</span>
                <span className="weave-edge__tooltip-score">{scorePercent}% match</span>
              </div>
              <p className="weave-edge__tooltip-description">{weave.description}</p>
              <div className="weave-edge__tooltip-repos">
                <span>{weave.sourceRepo.name}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M6 4L10 8L6 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{weave.targetRepo.name}</span>
              </div>
              <Link
                href={`/plexus/${data?.plexusId}/weaves/${weave.id}`}
                className="weave-edge__tooltip-link"
                onClick={(e) => e.stopPropagation()}
              >
                View Full Details
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M6 4L10 8L6 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          )}
        </button>
      </EdgeLabelRenderer>
    </>
  )
}

const nodeTypes = {
  repo: RepoNode,
}

const edgeTypes = {
  weave: WeaveEdge,
}

function createInitialNodes(repos: Repo[]): Node<RepoNodeData>[] {
  // Spread nodes in a circle for better initial layout
  const radius = Math.min(600, repos.length * 80)

  return repos.map((repo, index) => {
    const angle = (2 * Math.PI * index) / repos.length
    return {
      id: repo.id,
      type: 'repo',
      position: {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      },
      data: { repo },
    }
  })
}

function createEdgesFromWeaves(
  weaves: Weave[],
  nodes: Node<RepoNodeData>[],
  plexusId: string,
): Edge<WeaveEdgeData>[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  return weaves.map((weave) => {
    const sourceNode = nodeMap.get(weave.sourceRepoId)
    const targetNode = nodeMap.get(weave.targetRepoId)

    // Determine best connection points based on relative positions
    let sourceHandle = 'bottom'
    let targetHandle = 'top'

    if (sourceNode && targetNode) {
      const dx = targetNode.position.x - sourceNode.position.x
      const dy = targetNode.position.y - sourceNode.position.y

      // If target is more to the side than below/above, use side handles
      if (Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0) {
          sourceHandle = 'right'
          targetHandle = 'left'
        } else {
          sourceHandle = 'left'
          targetHandle = 'right'
        }
      } else if (dy < 0) {
        sourceHandle = 'top'
        targetHandle = 'bottom'
      }
    }

    return {
      id: `weave-${weave.id}`,
      source: weave.sourceRepoId,
      target: weave.targetRepoId,
      sourceHandle,
      targetHandle,
      type: 'weave',
      data: { weave, plexusId },
      animated: false,
    }
  })
}

export type RepoFlowGraphProps = {
  repos: Repo[]
  weaves: Weave[]
  plexusId: string
}

function RepoFlowGraphInner({ repos, weaves, plexusId }: RepoFlowGraphProps) {
  const { fitView } = useReactFlow()
  const [isDragging, setIsDragging] = useState(false)

  // Create initial nodes
  const initialNodes = useMemo(() => createInitialNodes(repos), [repos])

  // Create edges for force layout (with weights based on weave scores)
  const forceEdges = useMemo(
    () =>
      weaves.map((w) => ({
        source: w.sourceRepoId,
        target: w.targetRepoId,
        data: {
          // Higher score = stronger connection = closer nodes
          weight: 0.2 + w.score * 0.5,
          // Higher score = shorter distance
          distance: 250 - w.score * 100,
        },
      })),
    [weaves],
  )

  // Use force layout hook
  const {
    nodes: forceNodes,
    isSimulating,
    alpha,
    fixNode,
    releaseNode,
  } = useForceLayout(initialNodes, forceEdges, {
    chargeStrength: -500,
    linkDistance: 220,
    linkStrength: 0.4,
    collideRadius: 160,
    centerStrength: 0.03,
    alphaDecay: 0.015,
  })

  // Create React Flow edges from weaves, updating handles based on current positions
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<WeaveEdgeData>>([])

  // Update edges when node positions change
  useEffect(() => {
    const newEdges = createEdgesFromWeaves(weaves, forceNodes, plexusId)
    setEdges(newEdges)
  }, [forceNodes, weaves, plexusId, setEdges])

  // Fit view when simulation settles
  useEffect(() => {
    if (!isSimulating && alpha < 0.01) {
      setTimeout(() => {
        fitView({ padding: 0.15, duration: 400 })
      }, 100)
    }
  }, [isSimulating, alpha, fitView])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      window.location.href = `/plexus/${plexusId}/repos/${node.id}`
    },
    [plexusId],
  )

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setIsDragging(true)
      fixNode(node.id, node.position.x, node.position.y)
    },
    [fixNode],
  )

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      fixNode(node.id, node.position.x, node.position.y)
    },
    [fixNode],
  )

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setIsDragging(false)
      // Keep node fixed at dropped position for a moment, then release
      setTimeout(() => {
        releaseNode(node.id)
      }, 500)
    },
    [releaseNode],
  )

  return (
    <>
      {/* Simulation status indicator */}
      <div className={`force-layout-status ${isSimulating ? 'force-layout-status--active' : ''}`}>
        <div className="force-layout-status__indicator" />
        <span>{isSimulating ? 'Settling layout...' : 'Layout stable'}</span>
        {isSimulating && (
          <span className="force-layout-status__alpha">{Math.round(alpha * 100)}%</span>
        )}
      </div>

      <ReactFlow
        nodes={forceNodes}
        edges={edges}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
        style={{
          opacity: isSimulating && alpha > 0.5 ? 0.7 : 1,
          transition: 'opacity 0.3s',
        }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background color="var(--color-border-subtle)" gap={20} size={1} />
        <Controls className="repo-flow-controls" showInteractive={false} />
        <MiniMap
          className="repo-flow-minimap"
          nodeColor={(node) => {
            const data = node.data as RepoNodeData
            return data.repo.lastIndexed ? 'var(--color-success)' : 'var(--color-fg-muted)'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          zoomable
          pannable
        />
      </ReactFlow>
    </>
  )
}

export function RepoFlowGraph({ repos, weaves, plexusId }: RepoFlowGraphProps) {
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
      <ReactFlowProvider>
        <RepoFlowGraphInner repos={repos} weaves={weaves} plexusId={plexusId} />
      </ReactFlowProvider>
    </div>
  )
}
