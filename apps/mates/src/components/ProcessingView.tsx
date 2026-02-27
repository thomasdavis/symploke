'use client'

import { Card } from '@symploke/ui/Card/Card'
import { useEffect, useRef, useState } from 'react'
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
      window.location.reload()
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`mates-${username}`)
      subscribedRef.current = false
    }
  }, [username])

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
    <div className="mates-processing">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}
      >
        <div className="mates-spinner">
          <div className="mates-spinner-ring" />
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
          }}
        >
          Building profile for {username}
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-fg-muted)' }}>
          This usually takes 30-60 seconds
        </p>
      </div>

      <Card style={{ width: '100%', maxWidth: '22rem', padding: 'var(--space-6)' }}>
        <div className="mates-steps">
          {STEPS.slice(0, -1).map((step, i) => {
            const isActive = i === currentStepIndex
            const isDone = i < currentStepIndex
            const isPending = i > currentStepIndex

            return (
              <div
                key={step.key}
                className={`mates-step ${isPending ? 'mates-step--pending' : ''}`}
              >
                {isDone && <span className="mates-step-dot mates-step-dot--done">✓</span>}
                {isActive && <span className="mates-step-dot mates-step-dot--active" />}
                {isPending && <span className="mates-step-dot mates-step-dot--pending" />}
                <span style={{ fontWeight: isActive ? 500 : 400 }}>{step.label}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {progressMessages.length > 0 && (
        <p className="mates-progress-log">{progressMessages[progressMessages.length - 1]}</p>
      )}
    </div>
  )
}
