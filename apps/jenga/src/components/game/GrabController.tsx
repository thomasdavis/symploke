'use client'

/**
 * GrabController handles the global pointer-up event to release blocks
 * even if the pointer leaves the block mesh.
 */

import { useEffect } from 'react'
import { useGameStore } from '@/hooks/useGameState'

export function GrabController() {
  const grabbedBlockId = useGameStore((s) => s.grabbedBlockId)
  const setGrabbedBlock = useGameStore((s) => s.setGrabbedBlock)

  useEffect(() => {
    if (!grabbedBlockId) return

    const handlePointerUp = () => {
      setGrabbedBlock(null)
    }

    window.addEventListener('pointerup', handlePointerUp)
    return () => window.removeEventListener('pointerup', handlePointerUp)
  }, [grabbedBlockId, setGrabbedBlock])

  return null
}
