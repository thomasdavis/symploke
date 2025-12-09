'use client'

import { useState, useEffect, useCallback } from 'react'
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
}

export function useWeaveProgress(plexusId: string) {
  const [state, setState] = useState<WeaveProgressState>(initialState)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return

    const channelName = `private-plexus-${plexusId}`
    let channel: Channel

    try {
      channel = pusher.subscribe(channelName)

      channel.bind('pusher:subscription_succeeded', () => {
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
          setState({
            status: 'running',
            runId: data.runId,
            repoPairsTotal: data.repoPairsTotal,
            repoPairsChecked: 0,
            weavesFound: 0,
            newWeaves: [],
            duration: null,
            error: null,
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
        }) => {
          setState((prev) => ({
            ...prev,
            repoPairsChecked: data.repoPairsChecked,
            repoPairsTotal: data.repoPairsTotal,
            weavesFound: data.weavesFound,
          }))
        },
      )

      channel.bind('weave:discovered', (data: { runId: string; weave: WeaveDiscoveredWeave }) => {
        setState((prev) => ({
          ...prev,
          weavesFound: prev.weavesFound + 1,
          newWeaves: [...prev.newWeaves, data.weave],
        }))
      })

      channel.bind(
        'weave:completed',
        (data: { runId: string; weavesSaved: number; duration: string }) => {
          setState((prev) => ({
            ...prev,
            status: 'completed',
            duration: data.duration,
          }))
        },
      )

      channel.bind('weave:error', (data: { runId: string; error: string }) => {
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
