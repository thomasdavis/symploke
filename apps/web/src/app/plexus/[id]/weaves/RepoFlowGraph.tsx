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

// Neural animation system - synaptic pulses traveling along connections
type SynapseAnimation = {
  intensity: 'subtle' | 'medium' | 'bright' // How bright the pulse is
  speed: number // Duration in ms (800-2500)
  delay: number // Stagger delay
  reverse: boolean
  cascadeGroup: number // Edges in same group fire together like neural cascades
}

// Context to track which edges are currently animating with their animation config
const AnimatingEdgesContext = createContext<Map<string, SynapseAnimation>>(new Map())

// Breathing phase context - shared breathing rhythm for all edges
const BreathingPhaseContext = createContext<number>(0)

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
  const breathingPhase = useContext(BreathingPhaseContext)

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
  const baseStrokeWidth = 1 + 19 * weave.score ** 2
  const hoverStrokeWidth = Math.min(baseStrokeWidth + 3, 24)

  // Base opacity with subtle breathing effect (varies by ±0.08)
  const breathingOffset = Math.sin(breathingPhase + weave.score * Math.PI) * 0.08
  const baseOpacity = 0.4 + weave.score * 0.35 + breathingOffset

  // Color: purple-blue spectrum, higher scores are brighter
  const lightness = 70 - weave.score * 25
  const chroma = 0.12 + weave.score * 0.08
  const strokeColor = `oklch(${lightness}% ${chroma} 280)`

  // Check if this edge should be animating (either hovered or randomly selected)
  const animation = animatingEdges.get(id)
  const isAnimating = isHovered || !!animation

  // Unique gradient ID for this edge
  const gradientId = `synapse-gradient-${id}`

  // Get gradient for synaptic pulse - electric blues/cyans with intensity variation
  const getSynapseGradient = () => {
    if (isHovered) {
      return [
        { offset: '0%', color: '#06b6d4', opacity: 0 },
        { offset: '10%', color: '#06b6d4', opacity: 0.6 },
        { offset: '35%', color: '#22d3ee', opacity: 1 },
        { offset: '50%', color: '#67e8f9', opacity: 1 },
        { offset: '65%', color: '#22d3ee', opacity: 1 },
        { offset: '90%', color: '#06b6d4', opacity: 0.6 },
        { offset: '100%', color: '#06b6d4', opacity: 0 },
      ]
    }
    // Intensity affects how bright the pulse is
    const intensityMultiplier =
      animation?.intensity === 'bright' ? 1 : animation?.intensity === 'medium' ? 0.7 : 0.4
    return [
      { offset: '0%', color: '#0891b2', opacity: 0 },
      { offset: '15%', color: '#06b6d4', opacity: 0.3 * intensityMultiplier },
      { offset: '40%', color: '#22d3ee', opacity: 0.8 * intensityMultiplier },
      { offset: '50%', color: '#67e8f9', opacity: intensityMultiplier },
      { offset: '60%', color: '#22d3ee', opacity: 0.8 * intensityMultiplier },
      { offset: '85%', color: '#06b6d4', opacity: 0.3 * intensityMultiplier },
      { offset: '100%', color: '#0891b2', opacity: 0 },
    ]
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

  const gradientStops = getSynapseGradient()
  const animationDelay = animation?.delay || 0
  const animationDuration = animation?.speed || 1500

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
        {/* Base edge - breathing opacity effect */}
        <path
          id={id}
          d={edgePath}
          fill="none"
          stroke={isHovered ? '#22d3ee' : strokeColor}
          strokeWidth={isHovered ? hoverStrokeWidth : baseStrokeWidth}
          strokeOpacity={isHovered ? 1 : baseOpacity}
          markerEnd={markerEnd}
          className="weave-edge__path"
          style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
        />
        {/* Synaptic pulse overlay - fires when animating */}
        {isAnimating && (
          <path
            d={edgePath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={isHovered ? hoverStrokeWidth + 4 : baseStrokeWidth + 3}
            strokeLinecap="round"
            className={`weave-edge__synapse ${isHovered ? 'weave-edge__synapse--hover' : ''}`}
            style={{
              animationDelay: `${animationDelay}ms`,
              animationDuration: `${animationDuration}ms`,
            }}
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
  const [animatingEdges, setAnimatingEdges] = useState<Map<string, SynapseAnimation>>(new Map())
  const [breathingPhase, setBreathingPhase] = useState(0)
  const edgeIdsRef = useRef<string[]>([])
  const edgeConnectionsRef = useRef<Map<string, { source: string; target: string }>>(new Map())

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

  // Keep track of edge IDs and their connections for cascade animation
  useEffect(() => {
    edgeIdsRef.current = edges.map((e) => e.id)
    const connections = new Map<string, { source: string; target: string }>()
    for (const edge of edges) {
      connections.set(edge.id, { source: edge.source, target: edge.target })
    }
    edgeConnectionsRef.current = connections
  }, [edges])

  // Breathing animation - slow sine wave for all edges
  useEffect(() => {
    if (!showEdges) return

    let animationFrame: number
    let startTime = performance.now()

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000 // seconds
      // Very slow breathing: 8 second cycle
      setBreathingPhase(elapsed * (Math.PI / 4))
      animationFrame = requestAnimationFrame(animate)
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [showEdges])

  // Neural cascade animation system
  useEffect(() => {
    if (!showEdges || edges.length === 0) return

    // Find edges connected to a node
    const getConnectedEdges = (nodeId: string, excludeEdge: string): string[] => {
      const connected: string[] = []
      for (const [edgeId, conn] of edgeConnectionsRef.current) {
        if (edgeId !== excludeEdge && (conn.source === nodeId || conn.target === nodeId)) {
          connected.push(edgeId)
        }
      }
      return connected
    }

    const triggerCascade = () => {
      const edgeIds = edgeIdsRef.current
      if (edgeIds.length === 0) return

      const selectedEdges = new Map<string, SynapseAnimation>()
      let cascadeGroup = 0

      // Pick 2-4 "origin" edges to start cascades from
      const originCount = Math.min(edgeIds.length, 2 + Math.floor(Math.random() * 3))
      const shuffled = [...edgeIds].sort(() => Math.random() - 0.5)
      const origins = shuffled.slice(0, originCount)

      // For each origin, potentially cascade to connected edges
      for (const originId of origins) {
        const intensity: SynapseAnimation['intensity'] =
          Math.random() > 0.6 ? 'bright' : Math.random() > 0.3 ? 'medium' : 'subtle'
        const baseSpeed = 1200 + Math.random() * 1000 // 1200-2200ms

        selectedEdges.set(originId, {
          intensity,
          speed: baseSpeed,
          delay: cascadeGroup * 80,
          reverse: Math.random() > 0.5,
          cascadeGroup,
        })

        // 60% chance to cascade to connected edges
        if (Math.random() > 0.4) {
          const conn = edgeConnectionsRef.current.get(originId)
          if (conn) {
            // Get edges connected to either end of this edge
            const cascadeTargets = [
              ...getConnectedEdges(conn.source, originId),
              ...getConnectedEdges(conn.target, originId),
            ]
            // Pick 1-3 connected edges to cascade to
            const cascadeCount = Math.min(cascadeTargets.length, 1 + Math.floor(Math.random() * 3))
            const cascadeEdges = cascadeTargets
              .sort(() => Math.random() - 0.5)
              .slice(0, cascadeCount)

            for (let i = 0; i < cascadeEdges.length; i++) {
              const cascadeId = cascadeEdges[i]
              if (cascadeId && !selectedEdges.has(cascadeId)) {
                selectedEdges.set(cascadeId, {
                  intensity: intensity === 'bright' ? 'medium' : 'subtle', // Cascaded pulses are dimmer
                  speed: baseSpeed + 200 + Math.random() * 400, // Slightly slower
                  delay: cascadeGroup * 80 + 150 + i * 100, // Staggered after origin
                  reverse: Math.random() > 0.5,
                  cascadeGroup,
                })
              }
            }
          }
        }
        cascadeGroup++
      }

      // Also add some random "background" pulses (very subtle)
      const backgroundCount = Math.min(
        edgeIds.length - selectedEdges.size,
        Math.floor(Math.random() * 4),
      )
      const remainingEdges = edgeIds.filter((id) => !selectedEdges.has(id))
      for (let i = 0; i < backgroundCount; i++) {
        const bgEdge = remainingEdges[Math.floor(Math.random() * remainingEdges.length)]
        if (bgEdge && !selectedEdges.has(bgEdge)) {
          selectedEdges.set(bgEdge, {
            intensity: 'subtle',
            speed: 2000 + Math.random() * 500,
            delay: Math.random() * 800,
            reverse: Math.random() > 0.5,
            cascadeGroup: -1,
          })
        }
      }

      setAnimatingEdges(selectedEdges)

      // Clear after longest animation completes
      const maxDuration = Math.max(
        ...Array.from(selectedEdges.values()).map((a) => a.speed + a.delay),
      )
      setTimeout(() => {
        setAnimatingEdges(new Map())
      }, maxDuration + 200)
    }

    // Start first cascade after a short delay
    const initialTimer = setTimeout(triggerCascade, 600)

    // Trigger cascades at semi-random intervals (more frequent for livelier feel)
    const interval = setInterval(
      () => {
        triggerCascade()
      },
      800 + Math.random() * 1200, // Every 0.8-2 seconds
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
      <BreathingPhaseContext.Provider value={breathingPhase}>
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
      </BreathingPhaseContext.Provider>
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
