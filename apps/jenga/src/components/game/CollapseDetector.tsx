'use client'

import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import { useGameStore } from '@/hooks/useGameState'
import { playSound } from '@/lib/audio/sounds'

const FALL_THRESHOLD_Y = -2
const VELOCITY_THRESHOLD = 5
const MIN_MOVING_BLOCKS = 4
const CHECK_INTERVAL = 15 // frames
const GRACE_PERIOD_MS = 4000 // wait 4s after PLAYING before checking

export function CollapseDetector() {
  const phase = useGameStore((s) => s.phase)
  const setPhase = useGameStore((s) => s.setPhase)
  const soundEnabled = useGameStore((s) => s.soundEnabled)
  const frameCount = useRef(0)
  const playStartTime = useRef<number | null>(null)
  const { world } = useRapier()

  // Track when PLAYING phase begins
  useEffect(() => {
    if (phase === 'PLAYING') {
      playStartTime.current = Date.now()
    } else {
      playStartTime.current = null
    }
  }, [phase])

  useFrame(() => {
    if (phase !== 'PLAYING') return

    // Grace period: don't check until physics has settled
    if (!playStartTime.current || Date.now() - playStartTime.current < GRACE_PERIOD_MS) return

    frameCount.current++
    if (frameCount.current % CHECK_INTERVAL !== 0) return

    let fallenCount = 0
    let fastMovingCount = 0

    world.bodies.forEach((body) => {
      if (body.isFixed()) return

      const pos = body.translation()
      const vel = body.linvel()

      if (pos.y < FALL_THRESHOLD_Y) {
        fallenCount++
      }

      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
      if (speed > VELOCITY_THRESHOLD) {
        fastMovingCount++
      }
    })

    if (fallenCount >= 2 || fastMovingCount >= MIN_MOVING_BLOCKS) {
      setPhase('COLLAPSED')
      if (soundEnabled) {
        playSound('crash')
      }
    }
  })

  return null
}
