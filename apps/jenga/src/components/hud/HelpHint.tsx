'use client'

import { useCallback, useEffect, useState } from 'react'

const DISMISS_KEY = 'jenga-help-dismissed'

export function HelpHint() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!sessionStorage.getItem(DISMISS_KEY)) {
      setVisible(true)
    }
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    sessionStorage.setItem(DISMISS_KEY, '1')
  }, [])

  if (!visible) return null

  return (
    <button type="button" className="jenga-help-hint" onClick={dismiss}>
      <div className="jenga-help-hint-card">
        <div className="jenga-help-hint-title">How to play</div>
        <ul className="jenga-help-hint-list">
          <li>
            <span className="jenga-help-hint-key">Click a block face</span>
            to push it out the other side
          </li>
          <li>
            <span className="jenga-help-hint-key">Hold click</span>
            to keep pushing until the block slides free
          </li>
          <li>
            <span className="jenga-help-hint-key">Orbit the camera</span>
            to choose which side to push from
          </li>
          <li>
            <span className="jenga-help-hint-key">Power slider</span>
            controls push strength (or Ctrl+Scroll)
          </li>
          <li>
            <span className="jenga-help-hint-key">Dimmed blocks</span>
            are in the top complete layer and can&apos;t be pushed
          </li>
        </ul>
        <div className="jenga-help-hint-dismiss">Click anywhere to dismiss</div>
      </div>
    </button>
  )
}
