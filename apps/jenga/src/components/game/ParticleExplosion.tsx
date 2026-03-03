'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/hooks/useGameState'

const PARTICLE_COUNT = 200

export function ParticleExplosion() {
  const phase = useGameStore((s) => s.phase)
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const startTime = useRef(Date.now())

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 2,
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 8,
      ),
      rotation: new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ),
      rotationSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      ),
      scale: 0.05 + Math.random() * 0.1,
      color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.8, 0.6),
    }))
  }, [])

  useFrame(() => {
    if (phase !== 'COLLAPSED' || !meshRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const matrix = new THREE.Matrix4()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i]!
      const t = elapsed

      // Position with gravity
      const px = p.position.x + p.velocity.x * t
      const py = p.position.y + p.velocity.y * t - 4.9 * t * t
      const pz = p.position.z + p.velocity.z * t

      // Fade out
      const fade = Math.max(0, 1 - t / 3)
      const s = p.scale * fade

      quaternion.setFromEuler(
        new THREE.Euler(
          p.rotation.x + p.rotationSpeed.x * t,
          p.rotation.y + p.rotationSpeed.y * t,
          p.rotation.z + p.rotationSpeed.z * t,
        ),
      )
      scale.set(s, s, s)
      matrix.compose(new THREE.Vector3(px, py, pz), quaternion, scale)

      meshRef.current.setMatrixAt(i, matrix)
      meshRef.current.setColorAt(i, p.color)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  if (phase !== 'COLLAPSED') return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  )
}
