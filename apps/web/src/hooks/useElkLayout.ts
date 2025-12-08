'use client'

import type { Edge, Node } from '@xyflow/react'
import ELK from 'elkjs/lib/elk.bundled.js'
import { useCallback, useEffect, useState } from 'react'

const elk = new ELK()

export type LayoutDirection = 'DOWN' | 'RIGHT' | 'UP' | 'LEFT'
export type LayoutAlgorithm = 'layered' | 'force' | 'stress' | 'radial'

export type ElkLayoutOptions = {
  direction?: LayoutDirection
  algorithm?: LayoutAlgorithm
  nodeSpacing?: number
  layerSpacing?: number
  edgeSpacing?: number
}

const defaultOptions: Required<ElkLayoutOptions> = {
  direction: 'RIGHT',
  algorithm: 'layered',
  nodeSpacing: 80,
  layerSpacing: 120,
  edgeSpacing: 30,
}

export async function getElkLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  options: ElkLayoutOptions = {},
): Promise<Node<T>[]> {
  const opts = { ...defaultOptions, ...options }

  if (nodes.length === 0) {
    return nodes
  }

  // Build ELK graph
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': opts.algorithm,
      'elk.direction': opts.direction,
      // Core spacing
      'elk.spacing.nodeNode': String(opts.nodeSpacing),
      'elk.spacing.edgeEdge': String(opts.edgeSpacing),
      'elk.spacing.edgeNode': String(Math.floor(opts.nodeSpacing / 2)),
      // Layered algorithm options
      'elk.layered.spacing.nodeNodeBetweenLayers': String(opts.layerSpacing),
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      // Force/stress algorithm options
      'elk.force.iterations': '500',
      'elk.stress.desiredEdgeLength': String(opts.layerSpacing * 1.5),
      'elk.stress.epsilon': '0.0001',
      // Node overlap prevention (critical for stress algorithm)
      'elk.spacing.componentComponent': String(opts.nodeSpacing * 2),
      'elk.separateConnectedComponents': 'true',
      // Padding around the entire graph
      'elk.padding': '[top=50,left=50,bottom=50,right=50]',
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.measured?.width ?? 260,
      height: node.measured?.height ?? 180,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  }

  try {
    const layoutedGraph = await elk.layout(elkGraph)

    // Map layout positions back to nodes
    const layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id)
      if (elkNode && elkNode.x !== undefined && elkNode.y !== undefined) {
        return {
          ...node,
          position: {
            x: elkNode.x,
            y: elkNode.y,
          },
        }
      }
      return node
    })

    return layoutedNodes
  } catch (error) {
    console.error('ELK layout error:', error)
    return nodes
  }
}

export function useElkLayout<T extends Record<string, unknown>>(
  initialNodes: Node<T>[],
  initialEdges: Edge[],
  options: ElkLayoutOptions = {},
) {
  const [nodes, setNodes] = useState<Node<T>[]>(initialNodes)
  const [edges] = useState<Edge[]>(initialEdges)
  const [isLayouting, setIsLayouting] = useState(true)

  const runLayout = useCallback(async () => {
    setIsLayouting(true)
    try {
      const layoutedNodes = await getElkLayout(initialNodes, initialEdges, options)
      setNodes(layoutedNodes)
    } finally {
      setIsLayouting(false)
    }
  }, [initialNodes, initialEdges, options])

  useEffect(() => {
    runLayout()
  }, [runLayout])

  return {
    nodes,
    edges,
    isLayouting,
    runLayout,
  }
}
