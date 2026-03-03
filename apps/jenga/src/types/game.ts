export type GamePhase = 'IDLE' | 'LOADING' | 'BUILDING' | 'PLAYING' | 'COLLAPSED'

export interface Score {
  total: number
  blocksRemoved: number
  streak: number
  bestStreak: number
  achievements: Achievement[]
}

export interface Achievement {
  id: string
  name: string
  description: string
  points: number
  earnedAt: number
}

export type GameMode = 'classic' | 'speedrun' | 'zen'
