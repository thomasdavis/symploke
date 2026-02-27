'use client'

import { Avatar } from '@symploke/ui/Avatar/Avatar'
import { Card } from '@symploke/ui/Card/Card'
import Link from 'next/link'

interface MatchCardProps {
  username: string
  match: {
    id: string
    similarityScore: number
    teaser: string | null
    targetProfile: {
      id: string
      username: string
      avatarUrl: string | null
      profileText: string | null
      facets: Array<{ title: string; content: string }> | null
    }
  }
}

export function MatchCard({ username, match }: MatchCardProps) {
  const { targetProfile, similarityScore, teaser } = match
  const facets = (targetProfile.facets as Array<{ title: string; content: string }>) ?? []

  return (
    <Link href={`/${targetProfile.username}`} style={{ textDecoration: 'none' }}>
      <Card className="mates-match-card">
        <Avatar.Root size="lg">
          {targetProfile.avatarUrl ? (
            <Avatar.Image src={targetProfile.avatarUrl} alt={targetProfile.username} />
          ) : (
            <Avatar.Fallback>{targetProfile.username[0]?.toUpperCase()}</Avatar.Fallback>
          )}
        </Avatar.Root>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="mates-match-name">{targetProfile.username}</span>
            <span className="mates-match-score">{Math.round(similarityScore * 100)}%</span>
          </div>

          {teaser && <p className="mates-match-teaser">{teaser}</p>}

          {facets.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-1)',
                marginTop: 'var(--space-2)',
              }}
            >
              {facets.slice(0, 3).map((facet) => (
                <span key={facet.title} className="mates-facet">
                  {facet.title}
                </span>
              ))}
            </div>
          )}

          <Link
            href={`/${username}/match/${targetProfile.username}`}
            className="mates-match-narrative-link"
            onClick={(e) => e.stopPropagation()}
          >
            How you connect &rarr;
          </Link>
        </div>
      </Card>
    </Link>
  )
}
