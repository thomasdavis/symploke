'use client'

import { useGameStore } from '@/hooks/useGameState'
import { getStreakLabel } from '@/lib/game/scoring'

export function ScoreDisplay() {
  const score = useGameStore((s) => s.score)
  const streakLabel = getStreakLabel(score.streak)

  return (
    <div className="jenga-score">
      <div className="jenga-score-label">Score</div>
      <div className="jenga-score-value">{score.total.toLocaleString()}</div>
      {score.streak > 1 && (
        <div className="jenga-score-streak">
          {score.streak}x streak {streakLabel && `\u2014 ${streakLabel}`}
        </div>
      )}
      <div className="jenga-score-label" style={{ marginTop: 4 }}>
        {score.blocksRemoved} blocks removed
      </div>
    </div>
  )
}
