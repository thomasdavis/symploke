'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getPusherClient } from '@/lib/pusher/client'
import type { Channel } from 'pusher-js'
import type { WeaveType } from '@symploke/db'

export interface WeaveDiscoveredWeave {
  id: string
  sourceRepoId: string
  targetRepoId: string
  type: WeaveType
  title: string
  description: string
  score: number
  sourceRepo: { name: string }
  targetRepo: { name: string }
}

export interface WeaveProgressState {
  status: 'idle' | 'running' | 'completed' | 'error'
  runId: string | null
  repoPairsTotal: number
  repoPairsChecked: number
  weavesFound: number
  newWeaves: WeaveDiscoveredWeave[]
  duration: string | null
  error: string | null
  currentSourceRepoName: string | null
  currentTargetRepoName: string | null
}

const initialState: WeaveProgressState = {
  status: 'idle',
  runId: null,
  repoPairsTotal: 0,
  repoPairsChecked: 0,
  weavesFound: 0,
  newWeaves: [],
  duration: null,
  error: null,
  currentSourceRepoName: null,
  currentTargetRepoName: null,
}

export function useWeaveProgress(plexusId: string) {
  const [state, setState] = useState<WeaveProgressState>(initialState)
  const [isConnected, setIsConnected] = useState(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Poll for status as a fallback (works even without Pusher)
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/plexus/${plexusId}/weaves/run`)
      if (response.ok) {
        const data = await response.json()
        console.log('[useWeaveProgress] Poll response:', data)
        if (data.status === 'running') {
          // Map discovered weaves from API response
          const discoveredWeaves: WeaveDiscoveredWeave[] = (data.discoveredWeaves || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (w: any) => ({
              id: w.id,
              sourceRepoId: w.sourceRepoId,
              targetRepoId: w.targetRepoId,
              type: w.type,
              title: w.title,
              description: w.description,
              score: w.score,
              sourceRepo: w.sourceRepo,
              targetRepo: w.targetRepo,
            }),
          )
          console.log('[useWeaveProgress] Discovered weaves from poll:', discoveredWeaves.length)
          setState((prev) => ({
            ...prev,
            status: 'running',
            runId: data.runId || prev.runId,
            repoPairsTotal: data.progress?.total || prev.repoPairsTotal,
            repoPairsChecked: data.progress?.checked || prev.repoPairsChecked,
            weavesFound: discoveredWeaves.length,
            newWeaves: discoveredWeaves,
            currentSourceRepoName: data.currentPair?.sourceRepoName ?? null,
            currentTargetRepoName: data.currentPair?.targetRepoName ?? null,
          }))
        } else if (data.status === 'idle' && state.status === 'running') {
          // Discovery just completed
          console.log('[useWeaveProgress] Discovery completed')
          setState((prev) => ({
            ...prev,
            status: 'completed',
          }))
        }
      }
    } catch (err) {
      console.error('[useWeaveProgress] Poll error:', err)
    }
  }, [plexusId, state.status])

  // Initial fetch and polling
  useEffect(() => {
    fetchStatus()

    // Poll every 2 seconds when running or every 5 seconds when idle
    const startPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      pollIntervalRef.current = setInterval(fetchStatus, state.status === 'running' ? 2000 : 5000)
    }

    startPolling()

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [fetchStatus, state.status])

  // Pusher real-time events (enhanced updates when available)
  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return

    const channelName = `private-plexus-${plexusId}`
    let channel: Channel

    try {
      channel = pusher.subscribe(channelName)

      channel.bind('pusher:subscription_succeeded', () => {
        console.log('[useWeaveProgress] Pusher connected to channel:', channelName)
        setIsConnected(true)
      })

      channel.bind('pusher:subscription_error', (error: unknown) => {
        console.error('Pusher subscription error:', error)
        setIsConnected(false)
      })

      // Listen for weave discovery events
      channel.bind(
        'weave:started',
        (data: { runId: string; plexusId: string; repoPairsTotal: number }) => {
          console.log('[useWeaveProgress] Pusher weave:started', data)
          setState({
            status: 'running',
            runId: data.runId,
            repoPairsTotal: data.repoPairsTotal,
            repoPairsChecked: 0,
            weavesFound: 0,
            newWeaves: [],
            duration: null,
            error: null,
            currentSourceRepoName: null,
            currentTargetRepoName: null,
          })
        },
      )

      channel.bind(
        'weave:progress',
        (data: {
          runId: string
          repoPairsChecked: number
          repoPairsTotal: number
          weavesFound: number
          currentSourceRepoName: string | null
          currentTargetRepoName: string | null
        }) => {
          console.log('[useWeaveProgress] Pusher weave:progress', data)
          setState((prev) => ({
            ...prev,
            repoPairsChecked: data.repoPairsChecked,
            repoPairsTotal: data.repoPairsTotal,
            weavesFound: data.weavesFound,
            currentSourceRepoName: data.currentSourceRepoName,
            currentTargetRepoName: data.currentTargetRepoName,
          }))
        },
      )

      channel.bind('weave:discovered', (data: { runId: string; weave: WeaveDiscoveredWeave }) => {
        console.log('[useWeaveProgress] Pusher weave:discovered', data)
        setState((prev) => ({
          ...prev,
          weavesFound: prev.weavesFound + 1,
          newWeaves: [...prev.newWeaves, data.weave],
        }))
      })

      channel.bind(
        'weave:completed',
        (data: { runId: string; weavesSaved: number; duration: string }) => {
          console.log('[useWeaveProgress] Pusher weave:completed', data)
          setState((prev) => ({
            ...prev,
            status: 'completed',
            duration: data.duration,
          }))
        },
      )

      channel.bind('weave:error', (data: { runId: string; error: string }) => {
        console.log('[useWeaveProgress] Pusher weave:error', data)
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: data.error,
        }))
      })
    } catch (error) {
      console.error('Error subscribing to Pusher channel:', error)
    }

    return () => {
      if (channel) {
        channel.unbind_all()
        pusher.unsubscribe(channelName)
      }
    }
  }, [plexusId])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  const isRunning = state.status === 'running'
  const progress =
    state.repoPairsTotal > 0 ? (state.repoPairsChecked / state.repoPairsTotal) * 100 : 0

  return {
    ...state,
    isConnected,
    isRunning,
    progress,
    reset,
  }
}
