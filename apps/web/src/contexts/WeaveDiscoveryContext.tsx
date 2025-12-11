'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
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

export interface WeaveLogEntry {
  id: string
  timestamp: string
  level: 'info' | 'debug' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

export interface WeaveDiscoveryState {
  status: 'idle' | 'running' | 'completed' | 'error'
  runId: string | null
  repoPairsTotal: number
  repoPairsChecked: number
  weavesFound: number
  newWeaves: WeaveDiscoveredWeave[]
  logs: WeaveLogEntry[]
  duration: string | null
  error: string | null
  currentSourceRepoName: string | null
  currentTargetRepoName: string | null
  startedAt: string | null
}

export interface WeaveDiscoveryContextValue extends WeaveDiscoveryState {
  isRunning: boolean
  progress: number
  isConnected: boolean
  triggerDiscovery: () => Promise<{ success: boolean; error?: string }>
  reset: () => void
}

const initialState: WeaveDiscoveryState = {
  status: 'idle',
  runId: null,
  repoPairsTotal: 0,
  repoPairsChecked: 0,
  weavesFound: 0,
  newWeaves: [],
  logs: [],
  duration: null,
  error: null,
  currentSourceRepoName: null,
  currentTargetRepoName: null,
  startedAt: null,
}

const WeaveDiscoveryContext = createContext<WeaveDiscoveryContextValue | null>(null)

export function useWeaveDiscovery() {
  const context = useContext(WeaveDiscoveryContext)
  if (!context) {
    throw new Error('useWeaveDiscovery must be used within a WeaveDiscoveryProvider')
  }
  return context
}

interface WeaveDiscoveryProviderProps {
  plexusId: string
  children: ReactNode
}

export function WeaveDiscoveryProvider({ plexusId, children }: WeaveDiscoveryProviderProps) {
  const router = useRouter()
  const [state, setState] = useState<WeaveDiscoveryState>(initialState)
  const [isConnected, setIsConnected] = useState(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPusherEventRef = useRef<number>(0)
  const logIdCounterRef = useRef(0)

  // Add a log entry
  const addLog = useCallback(
    (level: WeaveLogEntry['level'], message: string, data?: Record<string, unknown>) => {
      logIdCounterRef.current += 1
      const entry: WeaveLogEntry = {
        id: `log-${logIdCounterRef.current}`,
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
      }
      setState((prev) => ({
        ...prev,
        logs: [...prev.logs, entry].slice(-500), // Keep last 500 logs
      }))
    },
    [],
  )

  // Poll for status as a fallback
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/plexus/${plexusId}/weaves/run`)
      if (response.ok) {
        const data = await response.json()
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
            startedAt: data.startedAt || prev.startedAt,
          }))
        } else if (data.status === 'idle') {
          // Don't override running status if we recently received a Pusher event
          const timeSinceLastPusher = Date.now() - lastPusherEventRef.current
          setState((prev) => {
            if (prev.status === 'running' && timeSinceLastPusher < 5000) {
              return prev // Ignore - race condition protection
            }
            if (prev.status === 'running') {
              // Discovery just completed
              return { ...prev, status: 'completed' }
            }
            return prev
          })
        }
      }
    } catch (err) {
      console.error('[WeaveDiscoveryContext] Poll error:', err)
    }
  }, [plexusId])

  // Initial fetch and polling setup
  useEffect(() => {
    fetchStatus()

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

  // Pusher real-time events
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

      channel.bind('pusher:subscription_error', () => {
        setIsConnected(false)
      })

      // weave:started
      channel.bind(
        'weave:started',
        (data: { runId: string; plexusId: string; repoPairsTotal: number }) => {
          lastPusherEventRef.current = Date.now()
          logIdCounterRef.current = 0
          setState({
            status: 'running',
            runId: data.runId,
            repoPairsTotal: data.repoPairsTotal,
            repoPairsChecked: 0,
            weavesFound: 0,
            newWeaves: [],
            logs: [],
            duration: null,
            error: null,
            currentSourceRepoName: null,
            currentTargetRepoName: null,
            startedAt: new Date().toISOString(),
          })
          addLog('info', `Starting weave discovery (${data.repoPairsTotal} pairs to check)`)
        },
      )

      // weave:progress
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
          lastPusherEventRef.current = Date.now()
          setState((prev) => ({
            ...prev,
            status: 'running',
            runId: data.runId,
            repoPairsChecked: data.repoPairsChecked,
            repoPairsTotal: data.repoPairsTotal,
            weavesFound: data.weavesFound,
            currentSourceRepoName: data.currentSourceRepoName,
            currentTargetRepoName: data.currentTargetRepoName,
          }))
          if (data.currentSourceRepoName && data.currentTargetRepoName) {
            addLog(
              'debug',
              `Checking pair: ${data.currentSourceRepoName} ↔ ${data.currentTargetRepoName}`,
              { checked: data.repoPairsChecked, total: data.repoPairsTotal },
            )
          }
        },
      )

      // weave:discovered
      channel.bind('weave:discovered', (data: { runId: string; weave: WeaveDiscoveredWeave }) => {
        lastPusherEventRef.current = Date.now()
        setState((prev) => ({
          ...prev,
          weavesFound: prev.weavesFound + 1,
          newWeaves: [...prev.newWeaves, data.weave],
        }))
        addLog(
          'info',
          `Found weave: ${data.weave.sourceRepo.name} ↔ ${data.weave.targetRepo.name}`,
          { type: data.weave.type, score: data.weave.score, title: data.weave.title },
        )
      })

      // weave:log - new event for detailed logging
      channel.bind(
        'weave:log',
        (data: {
          runId: string
          level: WeaveLogEntry['level']
          message: string
          data?: Record<string, unknown>
        }) => {
          lastPusherEventRef.current = Date.now()
          addLog(data.level, data.message, data.data)
        },
      )

      // weave:completed
      channel.bind(
        'weave:completed',
        (data: { runId: string; weavesSaved: number; duration: string }) => {
          setState((prev) => ({
            ...prev,
            status: 'completed',
            duration: data.duration,
          }))
          addLog(
            'info',
            `Discovery completed: ${data.weavesSaved} weaves saved in ${data.duration}`,
          )
          // Refresh router to update weave lists
          router.refresh()
        },
      )

      // weave:error
      channel.bind('weave:error', (data: { runId: string; error: string }) => {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: data.error,
        }))
        addLog('error', `Discovery failed: ${data.error}`)
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
  }, [plexusId, addLog, router])

  // Trigger discovery
  const triggerDiscovery = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/plexus/${plexusId}/weaves/run`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          // Already running
          await fetchStatus()
          return { success: true }
        }
        return { success: false, error: data.error?.message || 'Failed to start weave discovery' }
      }

      // Started successfully
      setState((prev) => ({
        ...prev,
        status: 'running',
        runId: data.runId || null,
        logs: [],
        newWeaves: [],
        weavesFound: 0,
        repoPairsChecked: 0,
        startedAt: new Date().toISOString(),
      }))

      return { success: true }
    } catch {
      return { success: false, error: 'Failed to connect to server' }
    }
  }, [plexusId, fetchStatus])

  // Reset state
  const reset = useCallback(() => {
    setState(initialState)
    logIdCounterRef.current = 0
  }, [])

  const isRunning = state.status === 'running'
  const progress =
    state.repoPairsTotal > 0 ? (state.repoPairsChecked / state.repoPairsTotal) * 100 : 0

  const value: WeaveDiscoveryContextValue = {
    ...state,
    isRunning,
    progress,
    isConnected,
    triggerDiscovery,
    reset,
  }

  return <WeaveDiscoveryContext.Provider value={value}>{children}</WeaveDiscoveryContext.Provider>
}
