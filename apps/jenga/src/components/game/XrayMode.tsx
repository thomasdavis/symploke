'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/hooks/useGameState'

export function XrayMode() {
  const xrayEnabled = useGameStore((s) => s.xrayEnabled)
  const tower = useGameStore((s) => s.tower)
  const graph = useGameStore((s) => s.graph)
  const removedBlockIds = useGameStore((s) => s.removedBlockIds)
  const lineRef = useRef<THREE.LineSegments>(null)

  const lineGeometry = useMemo(() => {
    if (!tower || !graph || !xrayEnabled) return null

    const positions: number[] = []
    const blockMap = new Map(tower.blocks.map((b) => [b.dependency.name, b]))

    for (const edge of graph.edges) {
      const fromBlock = blockMap.get(edge.from)
      const toBlock = blockMap.get(edge.to)

      if (!fromBlock || !toBlock) continue
      if (removedBlockIds.has(fromBlock.id) || removedBlockIds.has(toBlock.id)) continue

      positions.push(
        fromBlock.position.x,
        fromBlock.position.y,
        fromBlock.position.z,
        toBlock.position.x,
        toBlock.position.y,
        toBlock.position.z,
      )
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [tower, graph, xrayEnabled, removedBlockIds])

  // Animate dash offset
  useFrame(({ clock }) => {
    if (lineRef.current && lineRef.current.material instanceof THREE.LineDashedMaterial) {
      ;(lineRef.current.material as unknown as { dashOffset: number }).dashOffset =
        -clock.elapsedTime * 0.5
    }
  })

  if (!xrayEnabled || !lineGeometry) return null

  return (
    <lineSegments ref={lineRef} geometry={lineGeometry}>
      <lineDashedMaterial
        color="#4488ff"
        dashSize={0.1}
        gapSize={0.05}
        opacity={0.5}
        transparent
        linewidth={1}
      />
    </lineSegments>
  )
}
