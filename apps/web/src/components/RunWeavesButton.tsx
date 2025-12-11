'use client'

import { useState } from 'react'
import { Button } from '@symploke/ui/Button/Button'
import { useRouter } from 'next/navigation'
import { useWeaveDiscovery } from '@/contexts/WeaveDiscoveryContext'
import './RunWeavesButton.css'

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
  const discovery = useWeaveDiscovery()
  const [isTriggering, setIsTriggering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    // If already running, navigate to run page
    if (discovery.isRunning) {
      router.push(`/plexus/${plexusId}/weaves/run`)
      return
    }

    // Otherwise, trigger discovery and navigate
    setIsTriggering(true)
    setError(null)

    const result = await discovery.triggerDiscovery()

    if (!result.success) {
      setError(result.error || 'Failed to start discovery')
      setIsTriggering(false)
      return
    }

    setIsTriggering(false)
    // Navigate to run page to see progress
    router.push(`/plexus/${plexusId}/weaves/run`)
  }

  const isLoading = isTriggering

  const getButtonText = () => {
    if (isLoading) return 'Starting...'
    if (discovery.isRunning) {
      const { repoPairsChecked, repoPairsTotal } = discovery
      if (repoPairsTotal > 0) {
        return `Weaving (${repoPairsChecked}/${repoPairsTotal})`
      }
      return 'Weaving...'
    }
    return 'Run Weaves'
  }

  return (
    <div className="run-weaves-button">
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isLoading}
        className={discovery.isRunning ? 'run-weaves-button--running' : ''}
      >
        {discovery.isRunning && <span className="run-weaves-button__spinner" aria-hidden="true" />}
        {getButtonText()}
      </Button>
      {error && <span className="run-weaves-button__error">{error}</span>}
    </div>
  )
}
