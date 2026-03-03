'use client'

import { useCallback, useRef } from 'react'
import { initAudio, playSound } from '@/lib/audio/sounds'
import { useGameStore } from './useGameState'

export function useBlockInteraction() {
  const soundEnabled = useGameStore((s) => s.soundEnabled)
  const setHoveredBlock = useGameStore((s) => s.setHoveredBlock)
  const setGrabbedBlock = useGameStore((s) => s.setGrabbedBlock)
  const grabbedBlockId = useGameStore((s) => s.grabbedBlockId)
  const grabStartTime = useRef<number>(0)

  const onBlockHover = useCallback(
    (blockId: string | null) => {
      setHoveredBlock(blockId)
      if (blockId && soundEnabled) {
        playSound('hover', 0.15)
      }
    },
    [setHoveredBlock, soundEnabled],
  )

  const onBlockGrab = useCallback(
    (blockId: string) => {
      initAudio()
      setGrabbedBlock(blockId)
      grabStartTime.current = Date.now()
      if (soundEnabled) {
        playSound('grab', 0.3)
      }
    },
    [setGrabbedBlock, soundEnabled],
  )

  const onBlockRelease = useCallback(() => {
    const elapsed = (Date.now() - grabStartTime.current) / 1000
    setGrabbedBlock(null)
    return elapsed
  }, [setGrabbedBlock])

  return {
    onBlockHover,
    onBlockGrab,
    onBlockRelease,
    grabbedBlockId,
  }
}
