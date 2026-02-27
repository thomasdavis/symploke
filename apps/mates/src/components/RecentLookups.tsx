'use client'

import { Avatar } from '@symploke/ui/Avatar/Avatar'
import { Card } from '@symploke/ui/Card/Card'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface ProfileLookup {
  username: string
  avatarUrl: string | null
  bio: string | null
  company: string | null
  location: string | null
  profileText: string | null
  facets: Array<{ title: string; content: string }> | null
  matchCount: number
}

interface Stats {
  totalProfiles: number
  readyProfiles: number
  totalMatches: number
  recentLookups: ProfileLookup[]
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
      <div className="mates-profiles-inner">
        <h2 className="mates-profiles-heading">
          {stats.readyProfiles} developer{stats.readyProfiles === 1 ? '' : 's'} in the network
        </h2>
        <p className="mates-profiles-subtext">
          {stats.totalMatches > 0
            ? `${stats.totalMatches} match${stats.totalMatches === 1 ? '' : 'es'} found so far. More profiles = better matches.`
            : 'Submit your username to start finding your coding mates.'}
        </p>

        {stats.recentLookups.length > 0 && (
          <div className="mates-profiles-grid">
            {stats.recentLookups.map((profile) => (
              <ProfileCard key={profile.username} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ProfileCard({ profile }: { profile: ProfileLookup }) {
  const facets = (profile.facets ?? []) as Array<{ title: string; content: string }>
  const meta = [profile.company, profile.location].filter(Boolean).join(' · ')

  return (
    <Link href={`/${profile.username}`} className="mates-profile-card-link">
      <Card className="mates-profile-card">
        <div className="mates-profile-card-header">
          <Avatar.Root size="lg">
            {profile.avatarUrl ? (
              <Avatar.Image src={profile.avatarUrl} alt={profile.username} />
            ) : (
              <Avatar.Fallback>{profile.username[0]?.toUpperCase()}</Avatar.Fallback>
            )}
          </Avatar.Root>
          <div className="mates-profile-card-info">
            <span className="mates-profile-card-name">{profile.username}</span>
            {meta && <span className="mates-profile-card-meta">{meta}</span>}
          </div>
        </div>

        {profile.profileText && <p className="mates-profile-card-text">{profile.profileText}</p>}

        {facets.length > 0 && (
          <div className="mates-profile-card-facets">
            {facets.slice(0, 4).map((facet) => (
              <span key={facet.title} className="mates-facet">
                {facet.title}
              </span>
            ))}
          </div>
        )}

        {profile.matchCount > 0 && (
          <span className="mates-profile-card-matches">
            {profile.matchCount} mate{profile.matchCount === 1 ? '' : 's'}
          </span>
        )}
      </Card>
    </Link>
  )
}
