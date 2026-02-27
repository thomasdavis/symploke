'use client'

import { Avatar } from '@symploke/ui/Avatar/Avatar'
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
    <section className="mates-social-section">
      <div className="mates-social-inner">
        <p className="mates-social-count">
          {stats.readyProfiles} developer{stats.readyProfiles === 1 ? '' : 's'} matched so far
        </p>
        {stats.recentLookups.length > 0 && (
          <div className="mates-lookup-list">
            {stats.recentLookups.slice(0, 5).map((lookup) => (
              <a key={lookup.username} href={`/${lookup.username}`} className="mates-lookup-item">
                <Avatar.Root size="sm">
                  {lookup.avatarUrl ? (
                    <Avatar.Image src={lookup.avatarUrl} alt={lookup.username} />
                  ) : (
                    <Avatar.Fallback>{lookup.username[0]?.toUpperCase()}</Avatar.Fallback>
                  )}
                </Avatar.Root>
                <span className="mates-lookup-name">{lookup.username}</span>
                <span>
                  found {lookup.matchCount} mate{lookup.matchCount === 1 ? '' : 's'}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
