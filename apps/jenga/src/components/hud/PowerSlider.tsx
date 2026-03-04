'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useGameStore } from '@/hooks/useGameState'

function isTouchDevice() {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
}

export function PowerSlider() {
  const pushPower = useGameStore((s) => s.pushPower)
  const setPushPower = useGameStore((s) => s.setPushPower)
  const barRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updateFromPointer = useCallback(
    (clientY: number) => {
      if (!barRef.current) return
      const rect = barRef.current.getBoundingClientRect()
      // Bottom of bar = 0.1, top of bar = 1.0
      const ratio = 1 - (clientY - rect.top) / rect.height
      const clamped = Math.max(0.1, Math.min(1.0, 0.1 + ratio * 0.9))
      setPushPower(clamped)
    },
    [setPushPower],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragging.current = true
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      updateFromPointer(e.clientY)
    },
    [updateFromPointer],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      e.preventDefault()
      updateFromPointer(e.clientY)
    },
    [updateFromPointer],
  )

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  // Prevent touch scrolling on the slider
  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const prevent = (e: TouchEvent) => e.preventDefault()
    el.addEventListener('touchmove', prevent, { passive: false })
    return () => el.removeEventListener('touchmove', prevent)
  }, [])

  // Normalized 0–1 for fill height (pushPower is 0.1–1.0)
  const fillRatio = (pushPower - 0.1) / 0.9
  const hue = 120 - fillRatio * 120 // green → red
  const fillColor = `hsl(${hue}, 70%, 55%)`

  return (
    <div className="jenga-power-slider">
      <span className="jenga-power-label">POWER</span>
      <div
        ref={barRef}
        className="jenga-power-bar"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="jenga-power-fill"
          style={{
            height: `${fillRatio * 100}%`,
            background: fillColor,
          }}
        />
        <div className="jenga-power-thumb" style={{ bottom: `${fillRatio * 100}%` }} />
      </div>
      <span className="jenga-power-value">{Math.round(pushPower * 100)}%</span>
      {!isTouchDevice() && <span className="jenga-power-hint">Ctrl+Scroll</span>}
    </div>
  )
}
