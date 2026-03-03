'use client'

import { SoundToggle } from './SoundToggle'
import { ThemeToggle } from './ThemeToggle'

export function Header({ showGameControls }: { showGameControls?: boolean }) {
  return (
    <header className="jenga-header">
      <div className="jenga-header-inner">
        <a href="/" className="jenga-header-logo">
          <span className="jenga-header-title">Jenga</span>
          <span className="jenga-header-badge">by Symploke</span>
        </a>
        <div className="jenga-header-actions">
          {showGameControls && <SoundToggle />}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
