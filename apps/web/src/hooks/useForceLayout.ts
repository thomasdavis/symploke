'use client'

import type { Node } from '@xyflow/react'
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force-3d'
import { useCallback, useEffect, useRef, useState } from 'react'

export type ForceLayoutOptions = {
  /** Repulsion strength between nodes (negative = repel). Default: -400 */
  chargeStrength?: number
  /** Default distance for links. Default: 200 */
  linkDistance?: number
  /** Strength of link force (0-1). Default: 0.3 */
  linkStrength?: number
  /** Collision radius around nodes. Default: 150 */
  collideRadius?: number
  /** Strength of centering force. Default: 0.05 */
  centerStrength?: number
  /** Alpha decay rate (lower = slower settling). Default: 0.02 */
  alphaDecay?: number
  /** Minimum alpha before simulation stops. Default: 0.001 */
  alphaMin?: number
  /** Whether to run continuously or stop when settled. Default: false */
  continuous?: boolean
}

interface SimNode extends SimulationNodeDatum {
  id: string
  x: number
  y: number
  z: number
}

interface SimLink {
  source: string | SimNode
  target: string | SimNode
  strength?: number
  distance?: number
}

const defaultOptions: Required<ForceLayoutOptions> = {
  chargeStrength: -400,
  linkDistance: 200,
  linkStrength: 0.3,
  collideRadius: 150,
  centerStrength: 0.05,
  alphaDecay: 0.02,
  alphaMin: 0.001,
  continuous: false,
}

export type ForceLayoutResult<T extends Record<string, unknown>> = {
  nodes: Node<T>[]
  isSimulating: boolean
  alpha: number
  restart: () => void
  stop: () => void
  reheat: () => void
  /** Fix a node's position (for dragging) */
  fixNode: (nodeId: string, x: number, y: number) => void
  /** Release a fixed node */
  releaseNode: (nodeId: string) => void
}

export function useForceLayout<T extends Record<string, unknown>>(
  initialNodes: Node<T>[],
  edges: { source: string; target: string; data?: { weight?: number; distance?: number } }[],
  options: ForceLayoutOptions = {},
): ForceLayoutResult<T> {
  const opts = { ...defaultOptions, ...options }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simulationRef = useRef<any>(null)
  const nodesRef = useRef<Node<T>[]>(initialNodes)
  const simNodesRef = useRef<Map<string, SimNode>>(new Map())

  const [nodes, setNodes] = useState<Node<T>[]>(initialNodes)
  const [isSimulating, setIsSimulating] = useState(true)
  const [alpha, setAlpha] = useState(1)

  // Initialize and run simulation
  useEffect(() => {
    if (initialNodes.length === 0) {
      setIsSimulating(false)
      return
    }

    // Create simulation nodes with initial positions
    // Spread nodes in a circle initially for better convergence
    const simNodes: SimNode[] = initialNodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / initialNodes.length
      const radius = Math.min(400, initialNodes.length * 50)
      return {
        id: n.id,
        x: n.position.x || Math.cos(angle) * radius,
        y: n.position.y || Math.sin(angle) * radius,
        z: 0,
      }
    })

    // Store in ref for quick lookup
    simNodesRef.current = new Map(simNodes.map((n) => [n.id, n]))

    // Create simulation links
    const simLinks: SimLink[] = edges.map((e) => ({
      source: e.source,
      target: e.target,
      strength: e.data?.weight ?? opts.linkStrength,
      distance: e.data?.distance ?? opts.linkDistance,
    }))

    // Create the simulation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const simulation = forceSimulation(simNodes as any, 2) // 2D simulation
      .force('charge', forceManyBody().strength(opts.chargeStrength).distanceMax(500))
      .force(
        'link',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        forceLink(simLinks as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .id((d: any) => d.id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .strength((d: any) => (typeof d.strength === 'number' ? d.strength : opts.linkStrength))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .distance((d: any) => (typeof d.distance === 'number' ? d.distance : opts.linkDistance)),
      )
      .force('center', forceCenter(0, 0, 0).strength(opts.centerStrength))
      .force('collide', forceCollide().radius(opts.collideRadius).strength(0.7))
      .force('x', forceX(0).strength(0.02))
      .force('y', forceY(0).strength(0.02))
      .alpha(1)
      .alphaDecay(opts.alphaDecay)
      .alphaMin(opts.alphaMin)
      .on('tick', () => {
        // Update React state with new positions
        const updatedNodes = nodesRef.current.map((node) => {
          const simNode = simNodesRef.current.get(node.id)
          if (simNode) {
            return {
              ...node,
              position: {
                x: simNode.x,
                y: simNode.y,
              },
            }
          }
          return node
        })
        nodesRef.current = updatedNodes
        setNodes(updatedNodes)
        setAlpha(simulation.alpha())
      })
      .on('end', () => {
        setIsSimulating(false)
        if (!opts.continuous) {
          simulation.stop()
        }
      })

    simulationRef.current = simulation
    setIsSimulating(true)

    return () => {
      simulation.stop()
    }
  }, [initialNodes.length, edges.length]) // Only re-run if node/edge count changes

  // Update node data when initialNodes change (but not positions if simulation is running)
  useEffect(() => {
    nodesRef.current = initialNodes.map((newNode) => {
      const existingNode = nodesRef.current.find((n) => n.id === newNode.id)
      if (existingNode && simulationRef.current) {
        // Keep simulation position, update data
        return {
          ...newNode,
          position: existingNode.position,
        }
      }
      return newNode
    })
  }, [initialNodes])

  const restart = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart()
      setIsSimulating(true)
    }
  }, [])

  const stop = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.stop()
      setIsSimulating(false)
    }
  }, [])

  const reheat = useCallback(() => {
    if (simulationRef.current) {
      simulationRef.current.alpha(0.3).restart()
      setIsSimulating(true)
    }
  }, [])

  const fixNode = useCallback((nodeId: string, x: number, y: number) => {
    const simNode = simNodesRef.current.get(nodeId)
    if (simNode) {
      simNode.fx = x
      simNode.fy = y
      simNode.fz = 0
    }
    if (simulationRef.current) {
      simulationRef.current.alpha(0.3).restart()
    }
  }, [])

  const releaseNode = useCallback((nodeId: string) => {
    const simNode = simNodesRef.current.get(nodeId)
    if (simNode) {
      simNode.fx = null
      simNode.fy = null
      simNode.fz = null
    }
  }, [])

  return {
    nodes,
    isSimulating,
    alpha,
    restart,
    stop,
    reheat,
    fixNode,
    releaseNode,
  }
}
