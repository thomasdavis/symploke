'use client'

import { useState, useEffect, useCallback } from 'react'
import { getPusherClient } from '@/lib/pusher/client'
import type { Channel } from 'pusher-js'

export type EmbedJobStatus =
  | 'PENDING'
  | 'CHUNKING'
  | 'EMBEDDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export interface EmbedProgressEvent {
  jobId: string
  repoId: string
  status: EmbedJobStatus
  processedFiles: number
  totalFiles: number
  chunksCreated: number
  embeddingsGenerated: number
  skippedFiles: number
  failedFiles: number
  error?: string
}

export interface EmbedState {
  [repoId: string]: EmbedProgressEvent | undefined
}

export function useEmbedProgress(plexusId: string) {
  const [embedState, setEmbedState] = useState<EmbedState>({})
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

      // Listen for embed events
      channel.bind('embed:started', (data: { jobId: string; repoId: string }) => {
        setEmbedState((prev) => ({
          ...prev,
          [data.repoId]: {
            jobId: data.jobId,
            repoId: data.repoId,
            status: 'PENDING',
            processedFiles: 0,
            totalFiles: 0,
            chunksCreated: 0,
            embeddingsGenerated: 0,
            skippedFiles: 0,
            failedFiles: 0,
          },
        }))
      })

      channel.bind('embed:progress', (data: EmbedProgressEvent) => {
        setEmbedState((prev) => ({
          ...prev,
          [data.repoId]: data,
        }))
      })

      channel.bind('embed:completed', (data: EmbedProgressEvent) => {
        setEmbedState((prev) => ({
          ...prev,
          [data.repoId]: data,
        }))
        // Clear completed status after 5 seconds
        setTimeout(() => {
          setEmbedState((prev) => {
            const next = { ...prev }
            delete next[data.repoId]
            return next
          })
        }, 5000)
      })

      channel.bind('embed:error', (data: { jobId: string; repoId: string; error: string }) => {
        setEmbedState((prev) => ({
          ...prev,
          [data.repoId]: {
            jobId: data.jobId,
            repoId: data.repoId,
            status: 'FAILED',
            processedFiles: 0,
            totalFiles: 0,
            chunksCreated: 0,
            embeddingsGenerated: 0,
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

  const triggerEmbed = useCallback(
    async (repoId: string) => {
      // Optimistically set embedding state
      setEmbedState((prev) => ({
        ...prev,
        [repoId]: {
          jobId: '',
          repoId,
          status: 'PENDING',
          processedFiles: 0,
          totalFiles: 0,
          chunksCreated: 0,
          embeddingsGenerated: 0,
          skippedFiles: 0,
          failedFiles: 0,
        },
      }))

      try {
        const response = await fetch(`/api/plexus/${plexusId}/repositories/${repoId}/embed`, {
          method: 'POST',
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error?.message || 'Failed to start embedding')
        }

        const data = await response.json()
        return data.jobId
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        setEmbedState((prev) => ({
          ...prev,
          [repoId]: {
            jobId: '',
            repoId,
            status: 'FAILED',
            processedFiles: 0,
            totalFiles: 0,
            chunksCreated: 0,
            embeddingsGenerated: 0,
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

  const getEmbedStatus = useCallback(
    (repoId: string): EmbedProgressEvent | undefined => {
      return embedState[repoId]
    },
    [embedState],
  )

  const isEmbedding = useCallback(
    (repoId: string): boolean => {
      const status = embedState[repoId]?.status
      return status === 'PENDING' || status === 'CHUNKING' || status === 'EMBEDDING'
    },
    [embedState],
  )

  return {
    embedState,
    isConnected,
    triggerEmbed,
    getEmbedStatus,
    isEmbedding,
  }
}
