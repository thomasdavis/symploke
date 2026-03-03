'use client'

import { create } from 'zustand'
import type { DependencyGraph } from '@/types/dependency'
import type { Achievement, GamePhase, Score } from '@/types/game'
import type { TowerLayout } from '@/types/tower'

interface GameState {
  // Phase
  phase: GamePhase
  setPhase: (phase: GamePhase) => void

  // Dependency data
  graph: DependencyGraph | null
  setGraph: (graph: DependencyGraph) => void

  // Tower
  tower: TowerLayout | null
  setTower: (tower: TowerLayout) => void
  removedBlockIds: Set<string>
  removeBlock: (id: string) => void

  // Jenga rules
  highestCompletedLevel: number
  isBlockEligible: (blockId: string) => boolean

  // Score
  score: Score
  addPoints: (points: number) => void
  incrementStreak: () => void
  resetStreak: () => void
  addAchievement: (achievement: Achievement) => void

  // Interaction
  hoveredBlockId: string | null
  setHoveredBlock: (id: string | null) => void
  grabbedBlockId: string | null
  setGrabbedBlock: (id: string | null) => void

  // Settings
  soundEnabled: boolean
  toggleSound: () => void
  xrayEnabled: boolean
  toggleXray: () => void

  // Reset
  reset: () => void
}

const initialScore: Score = {
  total: 0,
  blocksRemoved: 0,
  streak: 0,
  bestStreak: 0,
  achievements: [],
}

/**
 * Compute the highest level where all blocks are still present.
 */
function computeHighestCompletedLevel(
  tower: TowerLayout | null,
  removedBlockIds: Set<string>,
): number {
  if (!tower) return -1

  // Group blocks by level
  const levelCounts = new Map<number, { total: number; remaining: number }>()
  for (const block of tower.blocks) {
    const entry = levelCounts.get(block.level) ?? { total: 0, remaining: 0 }
    entry.total++
    if (!removedBlockIds.has(block.id)) entry.remaining++
    levelCounts.set(block.level, entry)
  }

  // Find highest level where all blocks remain
  let highest = -1
  for (const [level, counts] of levelCounts) {
    if (counts.remaining === counts.total && level > highest) {
      highest = level
    }
  }
  return highest
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'IDLE',
  setPhase: (phase) => set({ phase }),

  graph: null,
  setGraph: (graph) => set({ graph }),

  tower: null,
  setTower: (tower) =>
    set((state) => ({
      tower,
      highestCompletedLevel: computeHighestCompletedLevel(tower, state.removedBlockIds),
    })),
  removedBlockIds: new Set(),
  removeBlock: (id) =>
    set((state) => {
      const next = new Set(state.removedBlockIds)
      next.add(id)
      return {
        removedBlockIds: next,
        highestCompletedLevel: computeHighestCompletedLevel(state.tower, next),
      }
    }),

  // Jenga rules
  highestCompletedLevel: -1,
  isBlockEligible: (blockId: string) => {
    const state = get()
    if (!state.tower) return false
    const block = state.tower.blocks.find((b) => b.id === blockId)
    if (!block) return false
    if (block.isGrouped) return false
    // Block must be below the highest completed level
    return block.level < state.highestCompletedLevel
  },

  score: { ...initialScore },
  addPoints: (points) =>
    set((state) => ({
      score: { ...state.score, total: state.score.total + points },
    })),
  incrementStreak: () =>
    set((state) => {
      const newStreak = state.score.streak + 1
      return {
        score: {
          ...state.score,
          streak: newStreak,
          bestStreak: Math.max(newStreak, state.score.bestStreak),
          blocksRemoved: state.score.blocksRemoved + 1,
        },
      }
    }),
  resetStreak: () =>
    set((state) => ({
      score: { ...state.score, streak: 0 },
    })),
  addAchievement: (achievement) =>
    set((state) => ({
      score: {
        ...state.score,
        total: state.score.total + achievement.points,
        achievements: [...state.score.achievements, achievement],
      },
    })),

  hoveredBlockId: null,
  setHoveredBlock: (id) => set({ hoveredBlockId: id }),
  grabbedBlockId: null,
  setGrabbedBlock: (id) => set({ grabbedBlockId: id }),

  soundEnabled: true,
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  xrayEnabled: false,
  toggleXray: () => set((state) => ({ xrayEnabled: !state.xrayEnabled })),

  reset: () =>
    set({
      phase: 'IDLE',
      graph: null,
      tower: null,
      removedBlockIds: new Set(),
      highestCompletedLevel: -1,
      score: { ...initialScore },
      hoveredBlockId: null,
      grabbedBlockId: null,
    }),
}))
