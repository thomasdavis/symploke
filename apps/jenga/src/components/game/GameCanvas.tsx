'use client'

import { Canvas } from '@react-three/fiber'
import { useTheme } from 'next-themes'
import { Suspense } from 'react'
import { useGameStore } from '@/hooks/useGameState'
import { CameraController } from './CameraController'
import { CollapseDetector } from './CollapseDetector'
import { Environment } from './Environment'
import { JengaTower } from './JengaTower'
import { PhysicsWorld } from './PhysicsWorld'
import { XrayMode } from './XrayMode'

export function GameCanvas() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const phase = useGameStore((s) => s.phase)

  return (
    <div className="jenga-canvas-wrapper">
      <Canvas
        shadows
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={{ position: [6, 5, 6], fov: 45 }}
        style={{ background: isDark ? '#0a0a0a' : '#f5f5f0' }}
      >
        <Suspense fallback={null}>
          <PhysicsWorld>
            <Environment isDark={isDark} />
            <CameraController />
            {(phase === 'BUILDING' || phase === 'PLAYING' || phase === 'COLLAPSED') && (
              <>
                <JengaTower />
                <CollapseDetector />
                <XrayMode />
              </>
            )}
          </PhysicsWorld>
        </Suspense>
      </Canvas>
    </div>
  )
}
