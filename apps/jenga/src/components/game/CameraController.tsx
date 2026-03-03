'use client'

import { OrbitControls } from '@react-three/drei'
import { useGameStore } from '@/hooks/useGameState'

export function CameraController() {
  const grabbedBlockId = useGameStore((s) => s.grabbedBlockId)

  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      minDistance={4}
      maxDistance={16}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2 - 0.1}
      enableDamping
      dampingFactor={0.05}
      // Disable orbit while dragging a block
      enabled={!grabbedBlockId}
    />
  )
}
