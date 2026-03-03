'use client'

import { useCallback, useState } from 'react'
import type { DependencyGraph } from '@/types/dependency'

interface UseDependencyDataResult {
  graph: DependencyGraph | null
  loading: boolean
  error: string | null
  fetchDeps: (owner: string, repo: string) => Promise<DependencyGraph | null>
}

export function useDependencyData(): UseDependencyDataResult {
  const [graph, setGraph] = useState<DependencyGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDeps = useCallback(async (owner: string, repo: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/deps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch dependencies')
      }

      setGraph(data)
      return data as DependencyGraph
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { graph, loading, error, fetchDeps }
}
