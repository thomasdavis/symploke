'use client'

import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { type RapierRigidBody, RigidBody } from '@react-three/rapier'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

const PULL_THRESHOLD = 0.6 // 60% pulled out = removed
const PUSH_FORCE_SCALE = 5.0 // base force (tunable)
const MAX_SPEED = 1.5 // hard speed limit so blocks never fly

export function JengaBlock({ block, isKinematic }: JengaBlockProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const [pullProgress, setPullProgress] = useState(0)
  const dragStartPos = useRef<THREE.Vector3 | null>(null)
  const pushDirection = useRef<THREE.Vector3 | null>(null)

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

  // Ctrl+scroll to adjust push power
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const { pushPower, setPushPower } = useGameStore.getState()
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      setPushPower(pushPower + delta)
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

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
      if (!eligible) return
      if (!meshRef.current || !e.face) return
      e.stopPropagation()

      // Get face normal in local space, transform to world space
      const worldNormal = e.face.normal
        .clone()
        .applyMatrix3(new THREE.Matrix3().getNormalMatrix(meshRef.current.matrixWorld))
        .normalize()

      // Ignore top/bottom face clicks (Y-dominant normals)
      if (Math.abs(worldNormal.y) > 0.5) return

      // Push direction = negate the normal (push inward from clicked face), horizontal only
      pushDirection.current = new THREE.Vector3(-worldNormal.x, 0, -worldNormal.z).normalize()

      onBlockGrab(block.id)

      // Record block position at grab time for displacement tracking
      if (rigidBodyRef.current) {
        const pos = rigidBodyRef.current.translation()
        dragStartPos.current = new THREE.Vector3(pos.x, pos.y, pos.z)
      } else {
        dragStartPos.current = e.point.clone()
      }
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
    pushDirection.current = null
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

  // Constant-direction push force while held
  useFrame(() => {
    if (!isThisGrabbed || !rigidBodyRef.current || !dragStartPos.current || !pushDirection.current)
      return

    const power = useGameStore.getState().pushPower
    const fx = pushDirection.current.x * power * PUSH_FORCE_SCALE
    const fz = pushDirection.current.z * power * PUSH_FORCE_SCALE
    rigidBodyRef.current.addForce({ x: fx, y: 0, z: fz }, true)

    // Anti-gravity when sinking
    const vel = rigidBodyRef.current.linvel()
    if (vel.y < -0.05) {
      rigidBodyRef.current.addForce({ x: 0, y: 9.81, z: 0 }, true)
    }

    // Clamp horizontal speed
    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z)
    const clampedVx = speed > MAX_SPEED ? (vel.x / speed) * MAX_SPEED : vel.x
    const clampedVz = speed > MAX_SPEED ? (vel.z / speed) * MAX_SPEED : vel.z
    const clampedVy = Math.max(-0.5, Math.min(0.3, vel.y))
    rigidBodyRef.current.setLinvel({ x: clampedVx, y: clampedVy, z: clampedVz }, true)

    // Kill angular velocity so block stays flat
    rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)

    // Track displacement for pull progress
    const bodyPos = rigidBodyRef.current.translation()
    const totalDisplacement = new THREE.Vector3(
      bodyPos.x - dragStartPos.current.x,
      0,
      bodyPos.z - dragStartPos.current.z,
    ).length()

    const maxPull = block.dimensions.depth * 1.2
    setPullProgress(Math.min(totalDisplacement / maxPull, 1))
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
      friction={0.12}
      restitution={0.02}
      mass={0.6}
      linearDamping={0.05}
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
