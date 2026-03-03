'use client'

import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/hooks/useGameState'
import type { BlockData } from '@/types/tower'
import { BuildAnimation } from './BuildAnimation'
import { JengaBlock } from './JengaBlock'

export function JengaTower() {
  const tower = useGameStore((s) => s.tower)
  const phase = useGameStore((s) => s.phase)
  const removedBlockIds = useGameStore((s) => s.removedBlockIds)
  const setPhase = useGameStore((s) => s.setPhase)
  const [visibleBlocks, setVisibleBlocks] = useState<BlockData[]>([])
  const [buildComplete, setBuildComplete] = useState(false)
  const buildTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (!tower || phase !== 'BUILDING') {
      setVisibleBlocks([])
      setBuildComplete(false)
      return
    }

    // Animate blocks appearing level by level
    const blocks = tower.blocks
    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex >= blocks.length) {
        clearInterval(interval)
        // Wait for physics to settle then start playing
        buildTimerRef.current = setTimeout(() => {
          setBuildComplete(true)
          setPhase('PLAYING')
        }, 1500)
        return
      }

      // Add 3 blocks at a time (one level)
      const nextBatch = blocks.slice(currentIndex, currentIndex + 3)
      setVisibleBlocks((prev) => [...prev, ...nextBatch])
      currentIndex += 3
    }, 200)

    return () => {
      clearInterval(interval)
      if (buildTimerRef.current) clearTimeout(buildTimerRef.current)
    }
  }, [tower, phase, setPhase])

  // Once playing, show all blocks
  const displayBlocks = phase === 'BUILDING' ? visibleBlocks : (tower?.blocks ?? [])

  return (
    <group>
      {displayBlocks
        .filter((block) => !removedBlockIds.has(block.id))
        .map((block, i) => (
          <JengaBlock
            key={block.id}
            block={block}
            isKinematic={phase === 'BUILDING' && !buildComplete}
          />
        ))}
      {phase === 'BUILDING' && (
        <BuildAnimation progress={visibleBlocks.length / (tower?.blocks.length ?? 1)} />
      )}
    </group>
  )
}
