'use client'

import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { type RapierRigidBody, RigidBody } from '@react-three/rapier'
import { useCallback, useRef, useState } from 'react'
import * as THREE from 'three'
import { useBlockInteraction } from '@/hooks/useBlockInteraction'
import { useGameStore } from '@/hooks/useGameState'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { calculatePullScore } from '@/lib/game/scoring'
import type { BlockData } from '@/types/tower'
import { BlockLabel } from './BlockLabel'

interface JengaBlockProps {
  block: BlockData
  isKinematic: boolean
  animationDelay: number
}

const PULL_THRESHOLD = 0.8 // 80% pulled out = removed

export function JengaBlock({ block, isKinematic, animationDelay }: JengaBlockProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const [_isHovered, setIsHovered] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)
  const dragStartPos = useRef<THREE.Vector3 | null>(null)

  const phase = useGameStore((s) => s.phase)
  const hoveredBlockId = useGameStore((s) => s.hoveredBlockId)
  const grabbedBlockId = useGameStore((s) => s.grabbedBlockId)
  const addPoints = useGameStore((s) => s.addPoints)
  const incrementStreak = useGameStore((s) => s.incrementStreak)
  const removeBlock = useGameStore((s) => s.removeBlock)
  const _graph = useGameStore((s) => s.graph)
  const _tower = useGameStore((s) => s.tower)

  const { onBlockHover, onBlockGrab, onBlockRelease } = useBlockInteraction()
  const { play } = useSoundEffects()

  const isThisHovered = hoveredBlockId === block.id
  const isThisGrabbed = grabbedBlockId === block.id

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (phase !== 'PLAYING' || grabbedBlockId) return
      e.stopPropagation()
      setIsHovered(true)
      onBlockHover(block.id)
    },
    [phase, grabbedBlockId, onBlockHover, block.id],
  )

  const handlePointerOut = useCallback(() => {
    if (grabbedBlockId === block.id) return
    setIsHovered(false)
    onBlockHover(null)
  }, [grabbedBlockId, block.id, onBlockHover])

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (phase !== 'PLAYING' || block.isGrouped) return
      e.stopPropagation()
      onBlockGrab(block.id)
      dragStartPos.current = e.point.clone()
    },
    [phase, block.id, block.isGrouped, onBlockGrab],
  )

  const handlePointerUp = useCallback(() => {
    if (!isThisGrabbed) return

    const elapsed = onBlockRelease()

    if (pullProgress >= PULL_THRESHOLD) {
      // Successfully pulled!
      play('pull')
      removeBlock(block.id)

      const points = calculatePullScore(
        {
          dependentCount: block.dependency.dependentCount,
          towerDisplacement: 10, // simplified
          timeTaken: elapsed,
          isXkcdBlock: block.isXkcdBlock,
          categoryStreak: 0,
        },
        useGameStore.getState().score.streak,
      )

      addPoints(points)
      incrementStreak()
    } else {
      // Spring back
      play('wobble')
    }

    setPullProgress(0)
    dragStartPos.current = null
  }, [
    isThisGrabbed,
    pullProgress,
    onBlockRelease,
    play,
    removeBlock,
    block.id,
    block.dependency.dependentCount,
    block.isXkcdBlock,
    addPoints,
    incrementStreak,
  ])

  // Apply forces during drag
  useFrame((state) => {
    if (!isThisGrabbed || !rigidBodyRef.current || !dragStartPos.current) return

    const pointer = state.pointer
    const camera = state.camera

    // Project pointer to world space at the block's depth
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(pointer, camera)

    const bodyPos = rigidBodyRef.current.translation()
    const blockWorldPos = new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z)

    // Calculate pull direction (perpendicular to the block's face)
    const isRotated = block.position.rotationY !== 0
    const pullAxis = isRotated ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)

    // Calculate displacement along pull axis from start
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      blockWorldPos,
    )
    const intersection = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, intersection)

    if (intersection) {
      const delta = intersection.sub(dragStartPos.current)
      const pullDistance = delta.dot(pullAxis)
      const maxPull = block.dimensions.depth * 1.2
      const progress = Math.min(Math.abs(pullDistance) / maxPull, 1)
      setPullProgress(progress)

      // Apply force to slide the block
      const force = pullAxis.clone().multiplyScalar(Math.sign(pullDistance) * progress * 3)
      rigidBodyRef.current.applyImpulse({ x: force.x, y: 0, z: force.z }, true)
    }
  })

  const { width, height, depth } = block.dimensions
  const { x, y, z, rotationY } = block.position

  // Block color with hover/grab highlighting
  const baseColor = new THREE.Color(block.color)
  const emissiveIntensity = isThisGrabbed ? 0.4 : isThisHovered ? 0.2 : 0

  return (
    <RigidBody
      ref={rigidBodyRef}
      type={isKinematic ? 'fixed' : 'dynamic'}
      position={[x, y, z]}
      rotation={[0, rotationY, 0]}
      friction={0.6}
      restitution={0.05}
      mass={1}
      linearDamping={0.5}
      angularDamping={0.8}
      ccd
    >
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.7}
          metalness={0.1}
          emissive={baseColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Edge lines for block definition */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial
          color={isThisHovered ? '#ffffff' : '#000000'}
          transparent
          opacity={isThisHovered ? 0.6 : 0.15}
        />
      </lineSegments>

      {/* XKCD marker */}
      {block.isXkcdBlock && (
        <mesh position={[0, height / 2 + 0.02, 0]}>
          <planeGeometry args={[0.15, 0.15]} />
          <meshBasicMaterial color="#ff4444" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label on hover */}
      {isThisHovered && <BlockLabel block={block} />}
    </RigidBody>
  )
}
