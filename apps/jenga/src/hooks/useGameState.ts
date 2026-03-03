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

export const useGameStore = create<GameState>((set, _get) => ({
  phase: 'IDLE',
  setPhase: (phase) => set({ phase }),

  graph: null,
  setGraph: (graph) => set({ graph }),

  tower: null,
  setTower: (tower) => set({ tower }),
  removedBlockIds: new Set(),
  removeBlock: (id) =>
    set((state) => {
      const next = new Set(state.removedBlockIds)
      next.add(id)
      return { removedBlockIds: next }
    }),

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
      score: { ...initialScore },
      hoveredBlockId: null,
      grabbedBlockId: null,
    }),
}))
