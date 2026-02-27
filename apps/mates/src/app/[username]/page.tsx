import { ProcessingView } from '@/components/ProcessingView'
import { MatchCard } from '@/components/MatchCard'

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

  // If profile doesn't exist, show submit prompt
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 gap-6">
        <h2 className="text-2xl font-bold">No profile found for {username}</h2>
        <p className="text-[var(--color-fg-muted)]">This user hasn&apos;t been analyzed yet.</p>
        <a
          href="/"
          className="px-6 py-3 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          Submit a username
        </a>
      </div>
    )
  }

  // If still processing, show progress view
  if (profile.status !== 'READY' && profile.status !== 'FAILED') {
    return <ProcessingView username={username} initialStatus={profile.status} />
  }

  // If failed, show error
  if (profile.status === 'FAILED') {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 gap-6">
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-[var(--color-fg-muted)]">
          {profile.error || 'Failed to build profile. Please try again.'}
        </p>
        <a
          href="/"
          className="px-6 py-3 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          Try again
        </a>
      </div>
    )
  }

  // Ready — show profile + matches
  const matches = profile.matchesAsSource || []
  const facets = (profile.facets as Array<{ title: string; content: string }>) ?? []

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      {/* Profile header */}
      <div className="flex items-start gap-5 mb-8">
        {profile.avatarUrl && (
          <img src={profile.avatarUrl} alt={profile.username} className="w-20 h-20 rounded-full" />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{profile.username}</h1>
          {profile.bio && <p className="text-[var(--color-fg-muted)] mt-1">{profile.bio}</p>}
          {(profile.company || profile.location) && (
            <p className="text-sm text-[var(--color-fg-muted)] mt-1">
              {[profile.company, profile.location].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* AI Profile */}
      {profile.profileText && (
        <div className="mb-8">
          <p className="text-[var(--color-fg)] leading-relaxed">{profile.profileText}</p>
        </div>
      )}

      {/* Facets */}
      {facets.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {facets.map((facet) => (
            <span
              key={facet.title}
              className="px-3 py-1.5 rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-sm font-medium"
              title={facet.content}
            >
              {facet.title}
            </span>
          ))}
        </div>
      )}

      {/* Matches */}
      <div className="border-t border-[var(--color-border-subtle)] pt-8">
        {matches.length > 0 ? (
          <>
            <h2 className="text-xl font-bold mb-4">Your Mates ({matches.length})</h2>
            <div className="flex flex-col gap-3">
              {matches.map((match: MatchData) => (
                <MatchCard key={match.id} username={username} match={match} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold mb-2">No mates yet</h2>
            <p className="text-[var(--color-fg-muted)] mb-4 max-w-md mx-auto">
              You&apos;re among the first developers in the network. As more people join,
              you&apos;ll start seeing matches. Share this page to grow the network!
            </p>
            <div className="flex justify-center gap-3">
              <a
                href="/"
                className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                Invite others
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
