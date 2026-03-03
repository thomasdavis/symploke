'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GameOverOverlay } from '@/components/hud/GameOverOverlay'
import { HUD } from '@/components/hud/HUD'
import { Header } from '@/components/shared/Header'
import { useGameStore } from '@/hooks/useGameState'
import { buildTowerLayout } from '@/lib/tower/layout-algorithm'
import type { DependencyGraph } from '@/types/dependency'

// Dynamic import for 3D canvas (no SSR)
const GameCanvas = dynamic(
  () => import('@/components/game/GameCanvas').then((m) => ({ default: m.GameCanvas })),
  { ssr: false },
)

export default function PlayPage() {
  const params = useParams<{ owner: string; repo: string }>()
  const owner = params.owner
  const repo = params.repo

  const phase = useGameStore((s) => s.phase)
  const setPhase = useGameStore((s) => s.setPhase)
  const setGraph = useGameStore((s) => s.setGraph)
  const setTower = useGameStore((s) => s.setTower)

  const [error, setError] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState('Fetching package.json...')

  useEffect(() => {
    if (phase !== 'IDLE') return

    let cancelled = false

    async function load() {
      setPhase('LOADING')
      setLoadingStatus('Fetching package.json from GitHub...')

      try {
        const res = await fetch('/api/deps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner, repo }),
        })

        if (cancelled) return

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to resolve dependencies')
        }

        setLoadingStatus('Building tower...')
        const graph = data as DependencyGraph
        setGraph(graph)

        const tower = buildTowerLayout(graph)
        setTower(tower)

        setPhase('BUILDING')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setPhase('IDLE')
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [owner, repo, phase, setPhase, setGraph, setTower])

  if (error) {
    return (
      <>
        <Header />
        <div className="jenga-loading">
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>:(</div>
          <div className="jenga-loading-text" style={{ color: 'var(--color-danger, #dd4444)' }}>
            {error}
          </div>
          <a
            href="/"
            style={{
              marginTop: 16,
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Try another repo
          </a>
        </div>
      </>
    )
  }

  if (phase === 'LOADING' || phase === 'IDLE') {
    return (
      <>
        <Header />
        <div className="jenga-loading">
          <div className="jenga-loading-spinner" />
          <div className="jenga-loading-text">
            Resolving {owner}/{repo}
          </div>
          <div className="jenga-loading-status">{loadingStatus}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header showGameControls />
      <div className="jenga-game-container">
        <GameCanvas />
        <HUD />
        <GameOverOverlay owner={owner} repo={repo} />
      </div>
    </>
  )
}
