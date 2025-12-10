'use client'

import type { WeaveType } from '@symploke/db'
import {
  Background,
  Controls,
  type Edge,
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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { WeaveDiscoveredWeave } from '@/hooks/useWeaveProgress'
import '@xyflow/react/dist/style.css'
import './weaves.css'

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
  // Store screen coordinates for the tooltip (not SVG coordinates)
  const [screenPosition, setScreenPosition] = useState<{ x: number; y: number } | null>(null)
  const weave = data?.weave

  const [edgePath] = getBezierPath({
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

  // Calculate stroke width using exponential scaling (1-20px range)
  // Using exponential curve: width = 1 + 19 * (score ^ 2)
  // This makes higher scores much more prominent
  // Score 0.2 (20%) ≈ 1.8px, Score 0.5 (50%) ≈ 5.75px, Score 1.0 (100%) = 20px
  const baseStrokeWidth = 1 + 19 * weave.score ** 2
  const hoverStrokeWidth = Math.min(baseStrokeWidth + 3, 24)

  // Track screen position (clientX/clientY) so tooltip doesn't scale with zoom
  const handleMouseMove = (e: React.MouseEvent<SVGGElement>) => {
    setScreenPosition({ x: e.clientX, y: e.clientY })
  }

  const handleMouseEnter = (e: React.MouseEvent<SVGGElement>) => {
    setIsHovered(true)
    setScreenPosition({ x: e.clientX, y: e.clientY })
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setScreenPosition(null)
  }

  // Handle click to navigate to weave details
  const handleClick = () => {
    if (data?.plexusId && weave?.id) {
      window.location.href = `/plexus/${data.plexusId}/weaves/${weave.id}`
    }
  }

  // Tooltip content rendered via portal to document.body (outside SVG/React Flow)
  const tooltip =
    isHovered && screenPosition
      ? createPortal(
          <div
            className="weave-edge__hover-card"
            style={{
              position: 'fixed',
              left: screenPosition.x,
              top: screenPosition.y - 12,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <div className="weave-edge__hover-card-content">
              <div className="weave-edge__hover-card-header">
                <span className="weave-edge__hover-card-title">{weave.title}</span>
                <span className="weave-edge__hover-card-score">{scorePercent}%</span>
              </div>
              <p className="weave-edge__hover-card-description">{weave.description}</p>
              <div className="weave-edge__hover-card-repos">
                <span>{weave.sourceRepo.name}</span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M4 8H12M12 8L8 4M12 8L8 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{weave.targetRepo.name}</span>
              </div>
              <div className="weave-edge__hover-card-hint">Click to view details</div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG group needs hover/click events for edge interaction */}
      <g
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        {/* Invisible wider path for easier hover/click */}
        <path
          id={`${id}-hitarea`}
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(24, baseStrokeWidth + 8)}
        />
        {/* Visible edge - stroke width based on score (exponential) */}
        <path
          id={id}
          d={edgePath}
          fill="none"
          stroke={isHovered ? 'var(--color-primary)' : 'var(--color-weave-edge)'}
          strokeWidth={isHovered ? hoverStrokeWidth : baseStrokeWidth}
          markerEnd={markerEnd}
          className="weave-edge__path"
          style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
        />
      </g>
      {tooltip}
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
  // Spread nodes in a larger circle for better initial layout with more spacing
  const radius = Math.max(800, repos.length * 120)

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
  isDiscoveryRunning?: boolean
  newWeaves?: WeaveDiscoveredWeave[]
}

function RepoFlowGraphInner({
  repos,
  weaves,
  plexusId,
  isDiscoveryRunning,
  newWeaves,
}: RepoFlowGraphProps) {
  const { fitView } = useReactFlow()
  const [showEdges, setShowEdges] = useState(false)
  const [edgesReady, setEdgesReady] = useState(false)

  // Create initial nodes
  const initialNodes = useMemo(() => createInitialNodes(repos), [repos])

  // Debug logging
  console.log('[RepoFlowGraph] Props:', {
    isDiscoveryRunning,
    newWeavesLength: newWeaves?.length ?? 0,
    weavesLength: weaves.length,
    showEdges,
    edgesReady,
  })

  // Convert newWeaves to Weave type for display
  const displayWeaves = useMemo((): Weave[] => {
    if (isDiscoveryRunning && newWeaves && newWeaves.length > 0) {
      // During discovery, only show newly discovered weaves
      console.log('[RepoFlowGraph] Showing newWeaves:', newWeaves.length)
      return newWeaves.map((w) => ({
        id: w.id,
        sourceRepoId: w.sourceRepoId,
        targetRepoId: w.targetRepoId,
        type: w.type,
        title: w.title,
        description: w.description,
        score: w.score,
        sourceRepo: w.sourceRepo,
        targetRepo: w.targetRepo,
      }))
    }
    if (isDiscoveryRunning) {
      // Discovery running but no weaves found yet - show empty
      console.log('[RepoFlowGraph] Discovery running, no weaves yet')
      return []
    }
    // Not running discovery - show existing weaves
    console.log('[RepoFlowGraph] Showing existing weaves:', weaves.length)
    return weaves
  }, [isDiscoveryRunning, newWeaves, weaves])

  // Use circle layout - no force simulation, just static circle positioning
  // This gives a cleaner, more predictable layout
  const circleNodes = initialNodes

  // Create React Flow edges from weaves, updating handles based on current positions
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<WeaveEdgeData>>([])

  // Update edges when weaves change
  useEffect(() => {
    const newEdges = createEdgesFromWeaves(displayWeaves, circleNodes, plexusId)
    setEdges(newEdges)
  }, [circleNodes, displayWeaves, plexusId, setEdges])

  // Fit view on initial load and show edges after a delay
  useEffect(() => {
    // Fit view after a short delay to let nodes render
    const fitTimer = setTimeout(() => {
      fitView({ padding: 0.15, duration: 400 })
    }, 100)

    return () => clearTimeout(fitTimer)
  }, [fitView])

  // Show edges after initial render settles
  useEffect(() => {
    if (!edgesReady) {
      setEdgesReady(true)
    }
    // Always show edges after a delay when not running discovery
    if (!isDiscoveryRunning && displayWeaves.length > 0) {
      const edgeTimer = setTimeout(() => {
        setShowEdges(true)
      }, 300)
      return () => clearTimeout(edgeTimer)
    }
  }, [edgesReady, isDiscoveryRunning, displayWeaves.length])

  // Reset edge visibility when discovery starts
  useEffect(() => {
    if (isDiscoveryRunning) {
      setShowEdges(false)
      setEdgesReady(false)
    }
  }, [isDiscoveryRunning])

  // During discovery, show edges immediately as they're found
  useEffect(() => {
    if (isDiscoveryRunning && newWeaves && newWeaves.length > 0) {
      setShowEdges(true)
      setEdgesReady(true)
    }
  }, [isDiscoveryRunning, newWeaves])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      window.location.href = `/plexus/${plexusId}/repos/${node.id}`
    },
    [plexusId],
  )

  return (
    <ReactFlow
      nodes={circleNodes}
      edges={showEdges ? edges : []}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
      proOptions={{ hideAttribution: true }}
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
  )
}

export function RepoFlowGraph({
  repos,
  weaves,
  plexusId,
  isDiscoveryRunning,
  newWeaves,
}: RepoFlowGraphProps) {
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
        <RepoFlowGraphInner
          repos={repos}
          weaves={weaves}
          plexusId={plexusId}
          isDiscoveryRunning={isDiscoveryRunning}
          newWeaves={newWeaves}
        />
      </ReactFlowProvider>
    </div>
  )
}
