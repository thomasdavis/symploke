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

// Pulse particle - a single glowing nodule traveling along edges
type PulseParticle = {
  id: number
  edgeId: string
  progress: number // 0 to 1
  speed: number // pixels per frame
  reverse: boolean // traveling source→target or target→source
}

// Context for active pulses on each edge
const ActivePulsesContext = createContext<Map<string, PulseParticle[]>>(new Map())

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
  const [screenPosition, setScreenPosition] = useState<{ x: number; y: number } | null>(null)
  const weave = data?.weave
  const activePulses = useContext(ActivePulsesContext)
  const pathRef = useRef<SVGPathElement>(null)

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

  // Stroke width based on score
  const baseStrokeWidth = 1 + 12 * weave.score ** 2
  const hoverStrokeWidth = Math.min(baseStrokeWidth + 3, 18)

  // Base opacity - dimmer to let pulses stand out
  const baseOpacity = 0.25 + weave.score * 0.25

  // Color: purple-blue spectrum
  const lightness = 65 - weave.score * 20
  const strokeColor = `oklch(${lightness}% 0.12 280)`

  // Get pulses for this edge
  const edgePulses = activePulses.get(id) || []

  // Calculate pulse positions along the path
  const getPulsePosition = (progress: number, reverse: boolean) => {
    if (!pathRef.current) return null
    const pathLength = pathRef.current.getTotalLength()
    const actualProgress = reverse ? 1 - progress : progress
    const point = pathRef.current.getPointAtLength(actualProgress * pathLength)
    return { x: point.x, y: point.y }
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

  // Unique filter ID for glow effect
  const glowFilterId = `pulse-glow-${id}`

  return (
    <>
      {/* Glow filter for pulses */}
      <defs>
        <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
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
        {/* Base edge - dim background line */}
        <path
          ref={pathRef}
          id={id}
          d={edgePath}
          fill="none"
          stroke={isHovered ? '#67e8f9' : strokeColor}
          strokeWidth={isHovered ? hoverStrokeWidth : baseStrokeWidth}
          strokeOpacity={isHovered ? 0.8 : baseOpacity}
          markerEnd={markerEnd}
          className="weave-edge__path"
          style={{ transition: 'stroke 0.15s, stroke-width 0.15s, stroke-opacity 0.15s' }}
        />
        {/* Render pulse nodules */}
        {edgePulses.map((pulse) => {
          const pos = getPulsePosition(pulse.progress, pulse.reverse)
          if (!pos) return null
          return (
            <circle
              key={pulse.id}
              cx={pos.x}
              cy={pos.y}
              r={6 + weave.score * 4}
              fill="#22d3ee"
              filter={`url(#${glowFilterId})`}
              className="weave-edge__pulse"
            />
          )
        })}
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
  const [activePulses, setActivePulses] = useState<Map<string, PulseParticle[]>>(new Map())
  const edgeIdsRef = useRef<string[]>([])
  const edgeConnectionsRef = useRef<Map<string, { source: string; target: string }>>(new Map())
  const pulseIdCounter = useRef(0)
  const particlesRef = useRef<PulseParticle[]>([])

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

  // Keep track of edge IDs and their connections
  useEffect(() => {
    edgeIdsRef.current = edges.map((e) => e.id)
    const connections = new Map<string, { source: string; target: string }>()
    for (const edge of edges) {
      connections.set(edge.id, { source: edge.source, target: edge.target })
    }
    edgeConnectionsRef.current = connections
  }, [edges])

  // Pulse particle animation system
  useEffect(() => {
    if (!showEdges || edges.length === 0) return

    // Get edges connected to a node
    const getConnectedEdges = (nodeId: string, excludeEdge: string): string[] => {
      const connected: string[] = []
      for (const [edgeId, conn] of edgeConnectionsRef.current) {
        if (edgeId !== excludeEdge && (conn.source === nodeId || conn.target === nodeId)) {
          connected.push(edgeId)
        }
      }
      return connected
    }

    // Spawn a new particle on a random edge
    const spawnParticle = (edgeId?: string) => {
      const edgeIds = edgeIdsRef.current
      if (edgeIds.length === 0) return

      const targetEdge = edgeId || edgeIds[Math.floor(Math.random() * edgeIds.length)]
      if (!targetEdge) return

      const conn = edgeConnectionsRef.current.get(targetEdge)
      if (!conn) return

      const particle: PulseParticle = {
        id: pulseIdCounter.current++,
        edgeId: targetEdge,
        progress: 0,
        speed: 0.008 + Math.random() * 0.006, // Progress per frame (0.008-0.014)
        reverse: Math.random() > 0.5,
      }

      particlesRef.current.push(particle)
    }

    // Animation loop
    let animationFrame: number
    let lastSpawnTime = 0
    const SPAWN_INTERVAL = 800 // Spawn new particle every 800ms
    const MAX_PARTICLES = Math.min(8, Math.ceil(edges.length / 3)) // Scale with edge count

    const animate = (time: number) => {
      // Spawn new particles periodically
      if (time - lastSpawnTime > SPAWN_INTERVAL && particlesRef.current.length < MAX_PARTICLES) {
        spawnParticle()
        lastSpawnTime = time
      }

      // Update particle positions
      const updatedParticles: PulseParticle[] = []
      const newPulseMap = new Map<string, PulseParticle[]>()

      for (const particle of particlesRef.current) {
        particle.progress += particle.speed

        if (particle.progress >= 1) {
          // Particle reached the end - find next edge
          const conn = edgeConnectionsRef.current.get(particle.edgeId)
          if (conn) {
            const endNode = particle.reverse ? conn.source : conn.target
            const connectedEdges = getConnectedEdges(endNode, particle.edgeId)

            if (connectedEdges.length > 0) {
              // Pick a random connected edge and continue
              const nextEdge = connectedEdges[Math.floor(Math.random() * connectedEdges.length)]
              if (nextEdge) {
                const nextConn = edgeConnectionsRef.current.get(nextEdge)
                if (nextConn) {
                  // Determine direction: continue away from current node
                  const reverse = nextConn.target === endNode
                  particle.edgeId = nextEdge
                  particle.progress = 0
                  particle.reverse = reverse
                  particle.speed = 0.008 + Math.random() * 0.006
                  updatedParticles.push(particle)
                }
              }
            }
            // If no connected edges, particle dies
          }
        } else {
          updatedParticles.push(particle)
        }
      }

      // Group particles by edge for rendering
      for (const particle of updatedParticles) {
        const existing = newPulseMap.get(particle.edgeId) || []
        existing.push(particle)
        newPulseMap.set(particle.edgeId, existing)
      }

      particlesRef.current = updatedParticles
      setActivePulses(newPulseMap)

      animationFrame = requestAnimationFrame(animate)
    }

    // Spawn initial particles
    const initialCount = Math.min(4, Math.ceil(edges.length / 4))
    for (let i = 0; i < initialCount; i++) {
      setTimeout(() => spawnParticle(), i * 200)
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrame)
      particlesRef.current = []
    }
  }, [showEdges, edges.length])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      window.location.href = `/plexus/${plexusId}/repos/${node.id}`
    },
    [plexusId],
  )

  return (
    <ActivePulsesContext.Provider value={activePulses}>
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
    </ActivePulsesContext.Provider>
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
