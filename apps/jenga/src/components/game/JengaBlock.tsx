'use client'

import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { type RapierRigidBody, RigidBody } from '@react-three/rapier'
import { useCallback, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useBlockInteraction } from '@/hooks/useBlockInteraction'
import { useGameStore } from '@/hooks/useGameState'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { calculatePullScore } from '@/lib/game/scoring'
import { getBlockRoughness } from '@/lib/tower/color-map'
import type { BlockData } from '@/types/tower'
import { BlockLabel } from './BlockLabel'

interface JengaBlockProps {
  block: BlockData
  isKinematic: boolean
}

const PULL_THRESHOLD = 0.8 // 80% pulled out = removed
const SPRING_K = 3 // gentle spring
const DAMPING_K = 8 // heavy damping — block moves like it's in honey
const MAX_FORCE = 1.5 // tight force cap
const MAX_SPEED = 0.8 // hard speed limit so blocks never fly

// Reusable objects to avoid per-frame allocation
const _raycaster = new THREE.Raycaster()
const _plane = new THREE.Plane()
const _intersection = new THREE.Vector3()
const _upVector = new THREE.Vector3(0, 1, 0)

export function JengaBlock({ block, isKinematic }: JengaBlockProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const [pullProgress, setPullProgress] = useState(0)
  const dragStartPos = useRef<THREE.Vector3 | null>(null)
  const grabOffset = useRef<THREE.Vector3 | null>(null) // offset from block center to click point
  const prevIntersection = useRef<THREE.Vector3 | null>(null)

  const phase = useGameStore((s) => s.phase)
  const hoveredBlockId = useGameStore((s) => s.hoveredBlockId)
  const grabbedBlockId = useGameStore((s) => s.grabbedBlockId)
  const addPoints = useGameStore((s) => s.addPoints)
  const incrementStreak = useGameStore((s) => s.incrementStreak)
  const removeBlock = useGameStore((s) => s.removeBlock)
  const isBlockEligible = useGameStore((s) => s.isBlockEligible)

  const { onBlockHover, onBlockGrab, onBlockRelease } = useBlockInteraction()
  const { play } = useSoundEffects()

  const isThisHovered = hoveredBlockId === block.id
  const isThisGrabbed = grabbedBlockId === block.id
  const eligible = isBlockEligible(block.id)

  const roughness = useMemo(() => getBlockRoughness(block.dependency.name), [block.dependency.name])

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (phase !== 'PLAYING' || grabbedBlockId) return
      e.stopPropagation()
      onBlockHover(block.id)
    },
    [phase, grabbedBlockId, onBlockHover, block.id],
  )

  const handlePointerOut = useCallback(() => {
    if (grabbedBlockId === block.id) return
    onBlockHover(null)
  }, [grabbedBlockId, block.id, onBlockHover])

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (phase !== 'PLAYING' || block.isGrouped) return
      if (!eligible) return // Jenga rule: can't grab top completed level
      e.stopPropagation()
      onBlockGrab(block.id)
      dragStartPos.current = e.point.clone()
      // grabOffset computed on first useFrame to use the same plane intersection method
      grabOffset.current = null
      prevIntersection.current = null
    },
    [phase, block.id, block.isGrouped, eligible, onBlockGrab],
  )

  const handlePointerUp = useCallback(() => {
    if (!isThisGrabbed) return

    const elapsed = onBlockRelease()

    if (pullProgress >= PULL_THRESHOLD) {
      play('pull')
      removeBlock(block.id)

      const points = calculatePullScore(
        {
          dependentCount: block.dependency.dependentCount,
          towerDisplacement: 10,
          timeTaken: elapsed,
          isXkcdBlock: block.isXkcdBlock,
          categoryStreak: 0,
        },
        useGameStore.getState().score.streak,
      )

      addPoints(points)
      incrementStreak()
    } else {
      play('wobble')
    }

    setPullProgress(0)
    dragStartPos.current = null
    grabOffset.current = null
    prevIntersection.current = null
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

  // Spring-force drag following mouse direction
  useFrame((state) => {
    if (!isThisGrabbed || !rigidBodyRef.current || !dragStartPos.current) return

    _raycaster.setFromCamera(state.pointer, state.camera)

    const bodyPos = rigidBodyRef.current.translation()
    const blockWorldPos = new THREE.Vector3(bodyPos.x, bodyPos.y, bodyPos.z)

    // Intersect pointer with horizontal plane at block's Y
    _plane.setFromNormalAndCoplanarPoint(_upVector, blockWorldPos)
    const hit = _raycaster.ray.intersectPlane(_plane, _intersection)
    if (!hit) return

    // On first frame after grab, record offset using the same plane method
    // so that holding still produces exactly zero force
    if (!grabOffset.current) {
      grabOffset.current = new THREE.Vector3(
        _intersection.x - bodyPos.x,
        0,
        _intersection.z - bodyPos.z,
      )
      prevIntersection.current = _intersection.clone()
      return // first frame: just record, don't apply anything
    }

    // Target = mouse plane intersection minus initial grab offset
    const targetX = _intersection.x - grabOffset.current.x
    const targetZ = _intersection.z - grabOffset.current.z
    const toTargetX = targetX - bodyPos.x
    const toTargetZ = targetZ - bodyPos.z
    const distToTarget = Math.sqrt(toTargetX * toTargetX + toTargetZ * toTargetZ)

    // If mouse hasn't moved meaningfully, don't touch the rigid body at all.
    // This lets the physics engine keep the block sleeping/stable.
    if (distToTarget < 0.01) return

    // Spring-damper force toward target
    const vel = rigidBodyRef.current.linvel()
    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z)

    const force = new THREE.Vector3(
      toTargetX * SPRING_K - vel.x * DAMPING_K,
      0,
      toTargetZ * SPRING_K - vel.z * DAMPING_K,
    )

    // Cap force magnitude
    const forceMag = force.length()
    if (forceMag > MAX_FORCE) {
      force.multiplyScalar(MAX_FORCE / forceMag)
    }

    rigidBodyRef.current.addForce({ x: force.x, y: 0, z: force.z }, true)

    // Anti-gravity: only when sinking (vel.y < 0), so blocks hover at their
    // level but never launch upward. Once the block starts rising the upward
    // force cuts off and gravity pulls it back naturally.
    if (vel.y < -0.05) {
      rigidBodyRef.current.addForce({ x: 0, y: 9.81, z: 0 }, true)
    }

    // Clamp horizontal speed and cap vertical velocity to a tight range.
    const clampedVx = speed > MAX_SPEED ? (vel.x / speed) * MAX_SPEED : vel.x
    const clampedVz = speed > MAX_SPEED ? (vel.z / speed) * MAX_SPEED : vel.z
    const clampedVy = Math.max(-0.5, Math.min(0.3, vel.y))
    rigidBodyRef.current.setLinvel({ x: clampedVx, y: clampedVy, z: clampedVz }, true)

    // Kill angular velocity so block stays flat
    rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)

    const totalDisplacement = new THREE.Vector3(
      bodyPos.x - dragStartPos.current.x,
      0,
      bodyPos.z - dragStartPos.current.z,
    ).length()

    const maxPull = block.dimensions.depth * 1.2
    setPullProgress(Math.min(totalDisplacement / maxPull, 1))

    prevIntersection.current = _intersection.clone()
  })

  const { width, height, depth } = block.dimensions
  const { x, y, z, rotationY } = block.position

  // Visual feedback for eligibility
  const baseColor = new THREE.Color(block.color)
  const materialOpacity = eligible || phase !== 'PLAYING' ? 1.0 : 0.85
  const emissiveIntensity = isThisGrabbed ? 0.3 : isThisHovered && eligible ? 0.15 : 0
  const edgeOpacity = isThisHovered ? 0.4 : 0.08

  return (
    <RigidBody
      ref={rigidBodyRef}
      type={isKinematic ? 'fixed' : 'dynamic'}
      position={[x, y, z]}
      rotation={[0, rotationY, 0]}
      friction={0.75}
      restitution={0.02}
      mass={1}
      linearDamping={0.4}
      angularDamping={0.9}
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
          roughness={roughness}
          metalness={0}
          emissive={baseColor}
          emissiveIntensity={emissiveIntensity}
          transparent={materialOpacity < 1}
          opacity={materialOpacity}
        />
      </mesh>

      {/* Subtle edge lines */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial
          color={isThisHovered ? '#ffffff' : '#000000'}
          transparent
          opacity={edgeOpacity}
        />
      </lineSegments>

      {/* XKCD marker — small red diamond on top */}
      {block.isXkcdBlock && (
        <mesh position={[0, height / 2 + 0.02, 0]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.1, 0.1]} />
          <meshBasicMaterial color="#e05555" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label on hover */}
      {isThisHovered && <BlockLabel block={block} />}
    </RigidBody>
  )
}
