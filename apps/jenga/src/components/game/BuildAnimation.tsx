'use client'

import { Html } from '@react-three/drei'

export function BuildAnimation({ progress }: { progress: number }) {
  const percent = Math.round(progress * 100)

  return (
    <Html center position={[0, -1, 3]} distanceFactor={10}>
      <div className="jenga-build-overlay">Building tower... {percent}%</div>
    </Html>
  )
}
