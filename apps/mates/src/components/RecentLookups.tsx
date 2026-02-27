'use client'

import { useEffect, useState } from 'react'

interface Stats {
  totalProfiles: number
  readyProfiles: number
  totalMatches: number
  recentLookups: Array<{
    username: string
    avatarUrl: string | null
    matchCount: number
  }>
}

export function RecentLookups() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  if (!stats || stats.readyProfiles === 0) return null

  return (
    <div className="flex flex-col items-center gap-4 mt-8">
      <p className="text-sm text-[var(--color-fg-muted)]">
        {stats.readyProfiles} developer{stats.readyProfiles === 1 ? '' : 's'} matched so far
      </p>
      {stats.recentLookups.length > 0 && (
        <div className="flex flex-col gap-2">
          {stats.recentLookups.slice(0, 5).map((lookup) => (
            <a
              key={lookup.username}
              href={`/${lookup.username}`}
              className="flex items-center gap-2 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
            >
              {lookup.avatarUrl && (
                <img
                  src={lookup.avatarUrl}
                  alt={lookup.username}
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span className="font-[var(--font-azeret-mono)]">{lookup.username}</span>
              <span>
                found {lookup.matchCount} mate{lookup.matchCount === 1 ? '' : 's'}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
