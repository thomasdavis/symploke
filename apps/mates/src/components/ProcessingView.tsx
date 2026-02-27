'use client'

import { useEffect, useState, useRef } from 'react'
import { getPusherClient } from '@/lib/pusher'

const STEPS = [
  { key: 'PENDING', label: 'Queued...' },
  { key: 'CRAWLING', label: 'Crawling GitHub activity...' },
  { key: 'SUMMARIZING', label: 'Analyzing your code...' },
  { key: 'EMBEDDING', label: 'Generating embeddings...' },
  { key: 'MATCHING', label: 'Finding your mates...' },
  { key: 'READY', label: 'Done!' },
]

export function ProcessingView({
  username,
  initialStatus,
}: {
  username: string
  initialStatus: string
}) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus)
  const [progressMessages, setProgressMessages] = useState<string[]>([])
  const subscribedRef = useRef(false)

  useEffect(() => {
    if (subscribedRef.current) return
    subscribedRef.current = true

    const pusher = getPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe(`mates-${username}`)

    channel.bind('status-update', (data: { status: string; step: string }) => {
      setCurrentStatus(data.status)
    })

    channel.bind('progress', (data: { step: string }) => {
      setProgressMessages((prev) => [...prev, data.step])
    })

    channel.bind('profile-ready', () => {
      // Reload the page to show matches
      window.location.reload()
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`mates-${username}`)
      subscribedRef.current = false
    }
  }, [username])

  // Also poll as fallback
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/profile/${username}`)
        const data = await res.json()
        if (data.status === 'READY' || data.status === 'FAILED') {
          window.location.reload()
        }
        setCurrentStatus(data.status)
      } catch {
        // Ignore polling errors
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [username])

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStatus)

  return (
    <div className="flex flex-col items-center gap-8 py-16 px-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--color-bg-subtle)] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
        </div>
        <h2 className="text-2xl font-bold">Building profile for {username}</h2>
        <p className="text-[var(--color-fg-muted)] text-sm">This usually takes 30-60 seconds</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        {STEPS.slice(0, -1).map((step, i) => {
          const isActive = i === currentStepIndex
          const isDone = i < currentStepIndex
          const isPending = i > currentStepIndex

          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 text-sm transition-opacity ${isPending ? 'opacity-30' : 'opacity-100'} ${isActive ? 'step-appear' : ''}`}
            >
              {isDone && (
                <span className="w-5 h-5 rounded-full bg-[var(--color-success)] flex items-center justify-center text-white text-xs">
                  ✓
                </span>
              )}
              {isActive && (
                <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] pulse-dot" />
              )}
              {isPending && (
                <span className="w-5 h-5 rounded-full border border-[var(--color-border)]" />
              )}
              <span className={isActive ? 'font-medium' : ''}>{step.label}</span>
            </div>
          )
        })}
      </div>

      {progressMessages.length > 0 && (
        <div className="w-full max-w-sm mt-4">
          <p className="text-xs text-[var(--color-fg-muted)] font-[var(--font-azeret-mono)]">
            {progressMessages[progressMessages.length - 1]}
          </p>
        </div>
      )}
    </div>
  )
}
