'use client'

import { SoundToggle } from '@/components/shared/SoundToggle'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useGameStore } from '@/hooks/useGameState'
import { BlockInfo } from './BlockInfo'
import { ConsequencePanel } from './ConsequencePanel'
import { HelpHint } from './HelpHint'
import { PowerSlider } from './PowerSlider'
import { ScoreDisplay } from './ScoreDisplay'

export function HUD() {
  const phase = useGameStore((s) => s.phase)
  const xrayEnabled = useGameStore((s) => s.xrayEnabled)
  const toggleXray = useGameStore((s) => s.toggleXray)

  if (phase !== 'PLAYING' && phase !== 'COLLAPSED') return null

  return (
    <div className="jenga-hud">
      <div className="jenga-hud-top-left">
        <ScoreDisplay />
      </div>

      <div className="jenga-hud-top-right">
        <button
          type="button"
          className={`jenga-hud-btn ${xrayEnabled ? 'active' : ''}`}
          onClick={toggleXray}
          aria-label="Toggle X-ray mode"
          title="Show dependency lines"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            role="img"
            aria-label="X-ray mode"
          >
            <title>X-ray mode</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
        </button>
        <SoundToggle />
        <ThemeToggle className="jenga-hud-btn" />
      </div>

      <div className="jenga-hud-bottom">
        <BlockInfo />
      </div>

      <div className="jenga-hud-bottom-right">
        <PowerSlider />
      </div>

      <ConsequencePanel />
      {phase === 'PLAYING' && <HelpHint />}
    </div>
  )
}
