'use client'

import { Button } from '@symploke/ui/Button/Button'
import { Card } from '@symploke/ui/Card/Card'
import { Separator } from '@symploke/ui/Separator/Separator'
import { Skeleton, SkeletonText } from '@symploke/ui/Skeleton/Skeleton'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function MatchNarrative({
  username,
  matchUsername,
}: {
  username: string
  matchUsername: string
}) {
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/match/${username}/${matchUsername}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then((data) => {
        setNarrative(data.narrative)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [username, matchUsername])

  return (
    <div className="mates-narrative">
      <Link href={`/${username}`} className="mates-back-link">
        &larr; Back to {username}&apos;s profile
      </Link>

      <h1 className="mates-narrative-title">
        {username} <span style={{ color: 'var(--color-fg-muted)', fontWeight: 400 }}>&amp;</span>{' '}
        {matchUsername}
      </h1>
      <p className="mates-narrative-subtitle">How these two developers connect</p>

      {loading && (
        <Card style={{ padding: 'var(--space-6)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Skeleton height={16} width="60%" />
            <SkeletonText lines={4} />
            <Skeleton height={16} width="40%" />
            <SkeletonText lines={3} />
          </div>
        </Card>
      )}

      {error && (
        <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-4)' }}>{error}</p>
          <a href={`/${username}`}>
            <Button variant="secondary" size="sm">
              Go back
            </Button>
          </a>
        </Card>
      )}

      {narrative && (
        <div className="mates-narrative-text">
          {narrative.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      )}

      <Separator style={{ marginTop: 'var(--space-8)' }} />

      <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-6)' }}>
        <Link href={`/${username}`}>
          <Button variant="secondary" size="sm">
            {username}&apos;s profile
          </Button>
        </Link>
        <Link href={`/${matchUsername}`}>
          <Button variant="secondary" size="sm">
            {matchUsername}&apos;s profile
          </Button>
        </Link>
      </div>
    </div>
  )
}
