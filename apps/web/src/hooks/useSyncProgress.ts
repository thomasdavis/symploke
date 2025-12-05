'use client'

import { useState, useEffect, useCallback } from 'react'
import { getPusherClient } from '@/lib/pusher/client'
import type { Channel } from 'pusher-js'

export type SyncJobStatus =
  | 'PENDING'
  | 'FETCHING_TREE'
  | 'PROCESSING_FILES'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export interface SyncProgressEvent {
  jobId: string
  repoId: string
  status: SyncJobStatus
  processedFiles: number
  totalFiles: number
  skippedFiles: number
  failedFiles: number
  currentFile?: string
  error?: string
}

export interface SyncState {
  [repoId: string]: SyncProgressEvent | undefined
}

export function useSyncProgress(plexusId: string) {
  const [syncState, setSyncState] = useState<SyncState>({})
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

      // Listen for sync events
      channel.bind('sync:started', (data: { jobId: string; repoId: string }) => {
        setSyncState((prev) => ({
          ...prev,
          [data.repoId]: {
            jobId: data.jobId,
            repoId: data.repoId,
            status: 'PENDING',
            processedFiles: 0,
            totalFiles: 0,
            skippedFiles: 0,
            failedFiles: 0,
          },
        }))
      })

      channel.bind('sync:progress', (data: SyncProgressEvent) => {
        setSyncState((prev) => ({
          ...prev,
          [data.repoId]: data,
        }))
      })

      channel.bind('sync:completed', (data: SyncProgressEvent) => {
        setSyncState((prev) => ({
          ...prev,
          [data.repoId]: data,
        }))
        // Clear completed status after 5 seconds
        setTimeout(() => {
          setSyncState((prev) => {
            const next = { ...prev }
            delete next[data.repoId]
            return next
          })
        }, 5000)
      })

      channel.bind('sync:error', (data: { jobId: string; repoId: string; error: string }) => {
        setSyncState((prev) => ({
          ...prev,
          [data.repoId]: {
            jobId: data.jobId,
            repoId: data.repoId,
            status: 'FAILED',
            processedFiles: 0,
            totalFiles: 0,
            skippedFiles: 0,
            failedFiles: 0,
            error: data.error,
          },
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

  const triggerSync = useCallback(
    async (repoId: string) => {
      // Optimistically set syncing state
      setSyncState((prev) => ({
        ...prev,
        [repoId]: {
          jobId: '',
          repoId,
          status: 'PENDING',
          processedFiles: 0,
          totalFiles: 0,
          skippedFiles: 0,
          failedFiles: 0,
        },
      }))

      try {
        const response = await fetch(`/api/plexus/${plexusId}/repositories/${repoId}/sync`, {
          method: 'POST',
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error?.message || 'Failed to start sync')
        }

        const data = await response.json()
        return data.jobId
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        setSyncState((prev) => ({
          ...prev,
          [repoId]: {
            jobId: '',
            repoId,
            status: 'FAILED',
            processedFiles: 0,
            totalFiles: 0,
            skippedFiles: 0,
            failedFiles: 0,
            error: message,
          },
        }))
        throw error
      }
    },
    [plexusId],
  )

  const getSyncStatus = useCallback(
    (repoId: string): SyncProgressEvent | undefined => {
      return syncState[repoId]
    },
    [syncState],
  )

  const isSyncing = useCallback(
    (repoId: string): boolean => {
      const status = syncState[repoId]?.status
      return status === 'PENDING' || status === 'FETCHING_TREE' || status === 'PROCESSING_FILES'
    },
    [syncState],
  )

  return {
    syncState,
    isConnected,
    triggerSync,
    getSyncStatus,
    isSyncing,
  }
}
