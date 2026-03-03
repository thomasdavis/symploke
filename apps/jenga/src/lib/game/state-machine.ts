import type { GamePhase } from '@/types/game'

const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  IDLE: ['LOADING'],
  LOADING: ['BUILDING', 'IDLE'], // IDLE for error
  BUILDING: ['PLAYING'],
  PLAYING: ['COLLAPSED'],
  COLLAPSED: ['LOADING', 'IDLE'], // replay or go home
}

export function canTransition(from: GamePhase, to: GamePhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}
