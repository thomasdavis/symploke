export interface PullResult {
  dependentCount: number
  towerDisplacement: number // mm
  timeTaken: number // seconds
  isXkcdBlock: boolean
  categoryStreak: number
}

export function calculatePullScore(result: PullResult, currentStreak: number): number {
  const base = 100 + result.dependentCount * 50

  // Difficulty multiplier based on tower stability
  let difficultyMult = 1.5
  if (result.towerDisplacement < 1) {
    difficultyMult = 2.0 // barely moved
  } else if (result.towerDisplacement > 50) {
    difficultyMult = 3.0 // almost fell - risk bonus!
  }

  // Streak bonus
  const streakBonuses = [1, 1.2, 1.5, 2, 3]
  const streakMult = streakBonuses[Math.min(currentStreak, streakBonuses.length - 1)] ?? 1

  let points = Math.round(base * difficultyMult * streakMult)

  // Speed demon bonus
  if (result.timeTaken < 5) {
    points += 200
  }

  // XKCD moment bonus
  if (result.isXkcdBlock) {
    points += 5000
  }

  // Category streak bonus
  if (result.categoryStreak >= 5) {
    points += 1000
  }

  return points
}

export function getStreakLabel(streak: number): string {
  if (streak >= 5) return 'UNSTOPPABLE'
  if (streak >= 4) return 'ON FIRE'
  if (streak >= 3) return 'HOT STREAK'
  if (streak >= 2) return 'NICE'
  return ''
}
