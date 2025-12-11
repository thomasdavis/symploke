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
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { WeaveDiscoveredWeave } from '@/hooks/useWeaveProgress'
import '@xyflow/react/dist/style.css'
import './weaves.css'

// Animation variants for playful variety
type BeamAnimation = {
  variant: 'pulse' | 'dash' | 'glow' | 'spark'
  reverse: boolean
  speed: 'slow' | 'normal' | 'fast'
  delay: number
}

// Context to track which edges are currently animating with their animation config
const AnimatingEdgesContext = createContext<Map<string, BeamAnimation>>(new Map())

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
  const animatingEdges = useContext(AnimatingEdgesContext)

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

  // Calculate opacity based on score (0.5 to 1.0)
  // Low score = 0.5 opacity, high score = 1.0 opacity
  const strokeOpacity = 0.5 + weave.score * 0.5

  // Calculate color lightness based on score
  // High score = darker (more saturated), low score = lighter (less saturated)
  // Using oklch: lightness from 75% (low score) to 45% (high score)
  const lightness = 75 - weave.score * 30
  const strokeColor = `oklch(${lightness}% 0.15 280)`

  // Check if this edge should be animating (either hovered or randomly selected)
  const animation = animatingEdges.get(id)
  const isAnimating = isHovered || !!animation

  // Unique gradient ID for this edge
  const gradientId = `beam-gradient-${id}`

  // Build animation class based on config
  const getAnimationClass = () => {
    if (isHovered) return 'weave-edge__beam--hover'
    if (!animation) return ''
    const classes = ['weave-edge__beam--random']
    classes.push(`weave-edge__beam--${animation.variant}`)
    classes.push(`weave-edge__beam--${animation.speed}`)
    if (animation.reverse) classes.push('weave-edge__beam--reverse')
    return classes.join(' ')
  }

  // Get gradient colors based on variant
  const getGradientStops = () => {
    if (isHovered) {
      // Consistent gradient for hover
      return [
        { offset: '0%', color: '#a855f7', opacity: 0 },
        { offset: '15%', color: '#a855f7', opacity: 1 },
        { offset: '50%', color: '#ec4899', opacity: 1 },
        { offset: '85%', color: '#f97316', opacity: 1 },
        { offset: '100%', color: '#f97316', opacity: 0 },
      ]
    }
    // Different color schemes for variety
    const schemes = {
      pulse: [
        { offset: '0%', color: '#06b6d4', opacity: 0 },
        { offset: '30%', color: '#06b6d4', opacity: 1 },
        { offset: '70%', color: '#8b5cf6', opacity: 1 },
        { offset: '100%', color: '#8b5cf6', opacity: 0 },
      ],
      dash: [
        { offset: '0%', color: '#10b981', opacity: 0 },
        { offset: '20%', color: '#10b981', opacity: 1 },
        { offset: '80%', color: '#34d399', opacity: 1 },
        { offset: '100%', color: '#34d399', opacity: 0 },
      ],
      glow: [
        { offset: '0%', color: '#f59e0b', opacity: 0 },
        { offset: '25%', color: '#f59e0b', opacity: 0.8 },
        { offset: '50%', color: '#fbbf24', opacity: 1 },
        { offset: '75%', color: '#f59e0b', opacity: 0.8 },
        { offset: '100%', color: '#f59e0b', opacity: 0 },
      ],
      spark: [
        { offset: '0%', color: '#ec4899', opacity: 0 },
        { offset: '10%', color: '#ec4899', opacity: 1 },
        { offset: '50%', color: '#f472b6', opacity: 1 },
        { offset: '90%', color: '#a855f7', opacity: 1 },
        { offset: '100%', color: '#a855f7', opacity: 0 },
      ],
    }
    return schemes[animation?.variant || 'pulse']
  }

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

  const gradientStops = getGradientStops()
  const animationDelay = animation?.delay || 0

  return (
    <>
      {/* Animated gradient definition */}
      {isAnimating && (
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={animation?.reverse ? targetX : sourceX}
            y1={animation?.reverse ? targetY : sourceY}
            x2={animation?.reverse ? sourceX : targetX}
            y2={animation?.reverse ? sourceY : targetY}
          >
            {gradientStops.map((stop, i) => (
              <stop
                key={i}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </linearGradient>
        </defs>
      )}
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
        {/* Base edge - stroke width, color, and opacity based on score */}
        <path
          id={id}
          d={edgePath}
          fill="none"
          stroke={isHovered ? 'var(--color-primary)' : strokeColor}
          strokeWidth={isHovered ? hoverStrokeWidth : baseStrokeWidth}
          strokeOpacity={isHovered ? 1 : strokeOpacity}
          markerEnd={markerEnd}
          className="weave-edge__path"
          style={{ transition: 'stroke 0.15s, stroke-width 0.15s, stroke-opacity 0.15s' }}
        />
        {/* Animated beam overlay - only shown when animating */}
        {isAnimating && (
          <path
            d={edgePath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={isHovered ? hoverStrokeWidth + 2 : baseStrokeWidth + 2}
            strokeLinecap="round"
            className={`weave-edge__beam ${getAnimationClass()}`}
            style={{ animationDelay: `${animationDelay}ms` }}
          />
        )}
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
  const [animatingEdges, setAnimatingEdges] = useState<Map<string, BeamAnimation>>(new Map())
  const edgeIdsRef = useRef<string[]>([])

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
      // During discovery, show newly discovered weaves from Pusher/polling
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
    if (isDiscoveryRunning && weaves.length > 0) {
      // Discovery running but newWeaves not populated yet - show server-side weaves as fallback
      // These are weaves already saved to DB from the current run
      console.log(
        '[RepoFlowGraph] Discovery running, showing server weaves as fallback:',
        weaves.length,
      )
      return weaves
    }
    if (isDiscoveryRunning) {
      // Discovery running and no weaves anywhere yet - show empty
      console.log('[RepoFlowGraph] Discovery running, no weaves yet')
      return []
    }
    // Not running discovery - show existing weaves
    console.log('[RepoFlowGraph] Showing existing weaves:', weaves.length)
    return weaves
  }, [isDiscoveryRunning, newWeaves, weaves])

  // Use state for nodes so they can be dragged
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<RepoNodeData>>(initialNodes)

  // Create React Flow edges from weaves, updating handles based on current positions
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<WeaveEdgeData>>([])

  // Update nodes when repos change
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  // Update edges when weaves or node positions change
  useEffect(() => {
    const newEdges = createEdgesFromWeaves(displayWeaves, nodes, plexusId)
    setEdges(newEdges)
  }, [nodes, displayWeaves, plexusId, setEdges])

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

  // Keep track of edge IDs for random animation selection
  useEffect(() => {
    edgeIdsRef.current = edges.map((e) => e.id)
  }, [edges])

  // Randomly animate edges at intervals - more playful with multiple simultaneous animations
  useEffect(() => {
    if (!showEdges || edges.length === 0) return

    const variants: BeamAnimation['variant'][] = ['pulse', 'dash', 'glow', 'spark']
    const speeds: BeamAnimation['speed'][] = ['slow', 'normal', 'fast']

    const animateRandomEdges = () => {
      const edgeIds = edgeIdsRef.current
      if (edgeIds.length === 0) return

      // Pick 3-6 random edges to animate simultaneously
      const count = Math.min(edgeIds.length, 3 + Math.floor(Math.random() * 4))
      const selectedEdges = new Map<string, BeamAnimation>()

      // Shuffle and pick unique edges
      const shuffled = [...edgeIds].sort(() => Math.random() - 0.5)

      for (let i = 0; i < count; i++) {
        const edgeId = shuffled[i]
        if (edgeId) {
          selectedEdges.set(edgeId, {
            variant: variants[Math.floor(Math.random() * variants.length)] || 'pulse',
            reverse: Math.random() > 0.5,
            speed: speeds[Math.floor(Math.random() * speeds.length)] || 'normal',
            delay: i * 150, // Stagger the animations
          })
        }
      }

      setAnimatingEdges(selectedEdges)

      // Clear animation after longest one completes (slow = 3s + max delay)
      setTimeout(() => {
        setAnimatingEdges(new Map())
      }, 3500)
    }

    // Start first animation after a short delay
    const initialTimer = setTimeout(animateRandomEdges, 800)

    // Then animate at random intervals (1.5-3 seconds between bursts)
    const interval = setInterval(
      () => {
        animateRandomEdges()
      },
      1500 + Math.random() * 1500,
    )

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [showEdges, edges.length])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      window.location.href = `/plexus/${plexusId}/repos/${node.id}`
    },
    [plexusId],
  )

  return (
    <AnimatingEdgesContext.Provider value={animatingEdges}>
      <ReactFlow
        nodes={nodes}
        edges={showEdges ? edges : []}
        onNodesChange={onNodesChange}
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
    </AnimatingEdgesContext.Provider>
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
