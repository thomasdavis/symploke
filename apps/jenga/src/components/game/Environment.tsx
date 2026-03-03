'use client'

import { Grid } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'

export function Environment({ isDark }: { isDark: boolean }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={isDark ? 0.3 : 0.5} />
      <directionalLight
        position={[8, 12, 5]}
        intensity={isDark ? 0.8 : 1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-5, 8, -3]} intensity={isDark ? 0.2 : 0.4} />
      <pointLight
        position={[0, 10, 0]}
        intensity={isDark ? 0.3 : 0.1}
        color={isDark ? '#4488dd' : '#ffffff'}
      />

      {/* Floor with physics */}
      <RigidBody type="fixed" friction={0.8} restitution={0.1}>
        <mesh receiveShadow position={[0, -0.05, 0]}>
          <boxGeometry args={[20, 0.1, 20]} />
          <meshStandardMaterial
            color={isDark ? '#1a1a1a' : '#e8e4d8'}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      </RigidBody>

      {/* Grid overlay */}
      <Grid
        position={[0, 0.01, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor={isDark ? '#333333' : '#cccccc'}
        sectionSize={2}
        sectionThickness={1}
        sectionColor={isDark ? '#444444' : '#aaaaaa'}
        fadeDistance={15}
        fadeStrength={1}
        infiniteGrid
      />
    </>
  )
}
