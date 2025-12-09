'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@symploke/ui/Button/Button'
import { useRouter } from 'next/navigation'
import './RunWeavesButton.css'

type WeaveStatus = {
  status: 'idle' | 'running'
  runId?: string
  startedAt?: string
  progress?: {
    total: number
    checked: number
  }
  latestRun?: {
    id: string
    status: string
    startedAt: string
    completedAt?: string
    weavesSaved: number
    error?: string
  }
}

type RunWeavesButtonProps = {
  plexusId: string
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md'
}

export function RunWeavesButton({
  plexusId,
  variant = 'primary',
  size = 'md',
}: RunWeavesButtonProps) {
  const router = useRouter()
  const [status, setStatus] = useState<WeaveStatus | null>(null)
  const [isTriggering, setIsTriggering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/plexus/${plexusId}/weaves/run`)
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Failed to fetch weave status:', err)
    }
  }, [plexusId])

  useEffect(() => {
    fetchStatus()

    // Poll for status when running
    const interval = setInterval(() => {
      if (status?.status === 'running') {
        fetchStatus()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [fetchStatus, status?.status])

  const handleTrigger = async () => {
    setIsTriggering(true)
    setError(null)

    try {
      const response = await fetch(`/api/plexus/${plexusId}/weaves/run`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          // Already running, just refresh status
          await fetchStatus()
        } else {
          setError(data.error?.message || 'Failed to start weave discovery')
        }
        return
      }

      // Started successfully, update status
      setStatus({ status: 'running' })

      // Start polling for updates
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(`/api/plexus/${plexusId}/weaves/run`)
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          setStatus(statusData)

          if (statusData.status === 'idle') {
            clearInterval(pollInterval)
            // Refresh the page to show new weaves
            router.refresh()
          }
        }
      }, 2000)

      // Clean up after 10 minutes max
      setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000)
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Failed to trigger weave run:', err)
    } finally {
      setIsTriggering(false)
    }
  }

  const isRunning = status?.status === 'running'
  const isLoading = isTriggering || (!status && !error)

  const getButtonText = () => {
    if (isLoading) return 'Loading...'
    if (isRunning) {
      const progress = status?.progress
      if (progress && progress.total > 0) {
        return `Running... ${progress.checked}/${progress.total}`
      }
      return 'Running...'
    }
    return 'Run Weave Discovery'
  }

  return (
    <div className="run-weaves-button">
      <Button
        variant={variant}
        size={size}
        onClick={handleTrigger}
        disabled={isRunning || isLoading}
        className={isRunning ? 'run-weaves-button--running' : ''}
      >
        {isRunning && <span className="run-weaves-button__spinner" aria-hidden="true" />}
        {getButtonText()}
      </Button>
      {error && <span className="run-weaves-button__error">{error}</span>}
    </div>
  )
}
