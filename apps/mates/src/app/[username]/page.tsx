import { Avatar } from '@symploke/ui/Avatar/Avatar'
import { Button } from '@symploke/ui/Button/Button'
import { EmptyState } from '@symploke/ui/EmptyState/EmptyState'
import { Separator } from '@symploke/ui/Separator/Separator'
import { MatchCard } from '@/components/MatchCard'
import { ProcessingView } from '@/components/ProcessingView'

interface MatchData {
  id: string
  targetProfile: {
    id: string
    username: string
    avatarUrl: string | null
    profileText: string | null
    facets: Array<{ title: string; content: string }> | null
  }
  similarityScore: number
  teaser: string | null
}

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:3001'

async function getProfile(username: string) {
  try {
    const res = await fetch(`${ENGINE_URL}/mates/profile/${username.toLowerCase()}`, {
      cache: 'no-store',
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return {
    title: `${username} — Mates by Symploke`,
    description: `See ${username}'s developer profile and coding mates.`,
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const profile = await getProfile(username)

  if (!profile) {
    return (
      <EmptyState
        title={`No profile for ${username}`}
        description="This user hasn't been analyzed yet. Submit their username to get started."
        actionLabel="Submit a username"
        actionHref="/"
      />
    )
  }

  if (profile.status !== 'READY' && profile.status !== 'FAILED') {
    return <ProcessingView username={username} initialStatus={profile.status} />
  }

  if (profile.status === 'FAILED') {
    return (
      <EmptyState
        title="Something went wrong"
        description={profile.error || 'Failed to build profile. Please try again.'}
        actionLabel="Try again"
        actionHref="/"
      />
    )
  }

  const matches = profile.matchesAsSource || []
  const facets = (profile.facets as Array<{ title: string; content: string }>) ?? []

  return (
    <div className="mates-profile">
      {/* Profile header */}
      <div className="mates-profile-header">
        <Avatar.Root size="lg" style={{ width: 80, height: 80 }}>
          {profile.avatarUrl ? (
            <Avatar.Image src={profile.avatarUrl} alt={profile.username} />
          ) : (
            <Avatar.Fallback>{profile.username[0]?.toUpperCase()}</Avatar.Fallback>
          )}
        </Avatar.Root>
        <div style={{ flex: 1 }}>
          <h1 className="mates-profile-name">{profile.username}</h1>
          {profile.bio && <p className="mates-profile-bio">{profile.bio}</p>}
          {(profile.company || profile.location) && (
            <p className="mates-profile-meta">
              {[profile.company, profile.location].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* AI Profile */}
      {profile.profileText && <p className="mates-profile-text">{profile.profileText}</p>}

      {/* Facets */}
      {facets.length > 0 && (
        <div className="mates-facets">
          {facets.map((facet) => (
            <span key={facet.title} className="mates-facet" title={facet.content}>
              {facet.title}
            </span>
          ))}
        </div>
      )}

      <Separator />

      {/* Matches */}
      <div style={{ paddingTop: 'var(--space-8)' }}>
        {matches.length > 0 ? (
          <>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-xl)',
                fontWeight: 600,
                marginBottom: 'var(--space-4)',
              }}
            >
              Your Mates ({matches.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {matches.map((match: MatchData) => (
                <MatchCard key={match.id} username={username} match={match} />
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-xl)',
                fontWeight: 600,
                marginBottom: 'var(--space-2)',
              }}
            >
              No mates yet
            </h2>
            <p
              style={{
                fontSize: 'var(--text-base)',
                color: 'var(--color-fg-muted)',
                maxWidth: '28rem',
                margin: '0 auto var(--space-6)',
              }}
            >
              You&apos;re among the first developers in the network. As more people join,
              you&apos;ll start seeing matches. Share this page to grow the network!
            </p>
            <a href="/">
              <Button variant="secondary" size="md">
                Invite others
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
