'use client'

import { Physics } from '@react-three/rapier'
import type { ReactNode } from 'react'

export function PhysicsWorld({ children }: { children: ReactNode }) {
  return (
    <Physics gravity={[0, -9.81, 0]} numSolverIterations={8} numAdditionalFrictionIterations={4}>
      {children}
    </Physics>
  )
}
