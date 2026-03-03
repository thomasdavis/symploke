'use client'

import { useCallback } from 'react'
import { playSound } from '@/lib/audio/sounds'
import { useGameStore } from './useGameState'

export function useSoundEffects() {
  const soundEnabled = useGameStore((s) => s.soundEnabled)

  const play = useCallback(
    (name: Parameters<typeof playSound>[0], volume?: number) => {
      if (soundEnabled) {
        playSound(name, volume)
      }
    },
    [soundEnabled],
  )

  return { play }
}
