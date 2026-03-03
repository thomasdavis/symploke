'use client'

import { useGameStore } from '@/hooks/useGameState'
import { useScreenshot } from '@/hooks/useScreenshot'

interface GameOverOverlayProps {
  owner: string
  repo: string
}

export function GameOverOverlay({ owner, repo }: GameOverOverlayProps) {
  const phase = useGameStore((s) => s.phase)
  const score = useGameStore((s) => s.score)
  const reset = useGameStore((s) => s.reset)
  const { downloadScreenshot, copyShareLink } = useScreenshot()

  if (phase !== 'COLLAPSED') return null

  const handleReplay = () => {
    reset()
    // The game page will re-trigger loading
    window.location.reload()
  }

  const handleShare = () => {
    copyShareLink(owner, repo)
  }

  return (
    <div className="jenga-game-over">
      <div className="jenga-game-over-card">
        <h2>Tower Collapsed!</h2>
        <div className="jenga-game-over-score">{score.total.toLocaleString()}</div>
        <div className="jenga-game-over-blocks">
          {score.blocksRemoved} block{score.blocksRemoved !== 1 ? 's' : ''} removed
          {score.bestStreak > 1 && ` \u2022 Best streak: ${score.bestStreak}x`}
        </div>

        {score.achievements.length > 0 && (
          <div style={{ marginBottom: 16, fontSize: '0.8rem' }}>
            {score.achievements.map((a) => (
              <div key={a.id} style={{ color: 'var(--color-primary)', marginBottom: 2 }}>
                {a.name} (+{a.points})
              </div>
            ))}
          </div>
        )}

        <div className="jenga-game-over-actions">
          <button type="button" className="jenga-replay-btn" onClick={handleReplay}>
            Play Again
          </button>
          <button type="button" className="jenga-share-btn" onClick={handleShare}>
            Copy Link
          </button>
          <button
            type="button"
            className="jenga-share-btn"
            onClick={() => downloadScreenshot(`${owner}-${repo}`, score.total)}
          >
            Save PNG
          </button>
        </div>
      </div>
    </div>
  )
}
