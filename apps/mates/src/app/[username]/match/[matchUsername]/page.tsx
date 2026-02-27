'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function MatchDetailPage() {
  const params = useParams()
  const username = params.username as string
  const matchUsername = params.matchUsername as string
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
    <div className="max-w-2xl mx-auto py-12 px-6">
      <Link
        href={`/${username}`}
        className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors mb-6 inline-block"
      >
        &larr; Back to {username}&apos;s profile
      </Link>

      <h1 className="text-3xl font-bold mb-2">
        {username} <span className="text-[var(--color-fg-muted)] font-normal">&amp;</span>{' '}
        {matchUsername}
      </h1>
      <p className="text-[var(--color-fg-muted)] mb-8">How these two developers connect</p>

      {loading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--color-fg-muted)]">Generating comparison narrative...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-[var(--color-danger)]">{error}</p>
        </div>
      )}

      {narrative && (
        <div className="prose prose-neutral max-w-none">
          {narrative.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-[var(--color-fg)] leading-relaxed mb-4">
              {paragraph}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-3 mt-8 pt-8 border-t border-[var(--color-border-subtle)]">
        <Link
          href={`/${username}`}
          className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-bg-subtle)] transition-colors"
        >
          View {username}&apos;s profile
        </Link>
        <Link
          href={`/${matchUsername}`}
          className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-bg-subtle)] transition-colors"
        >
          View {matchUsername}&apos;s profile
        </Link>
      </div>
    </div>
  )
}
