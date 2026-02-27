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
    <Link
      href={`/${username}/match/${targetProfile.username}`}
      className="mates-card p-5 flex gap-4 group"
    >
      <div className="flex-shrink-0">
        {targetProfile.avatarUrl ? (
          <img
            src={targetProfile.avatarUrl}
            alt={targetProfile.username}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[var(--color-bg-subtle)] flex items-center justify-center text-lg font-bold text-[var(--color-fg-muted)]">
            {targetProfile.username[0]?.toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold group-hover:text-[var(--color-primary)] transition-colors">
            {targetProfile.username}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-fg-muted)]">
            {Math.round(similarityScore * 100)}% match
          </span>
        </div>

        {teaser && (
          <p className="text-sm text-[var(--color-fg-muted)] mb-2 line-clamp-2">{teaser}</p>
        )}

        {facets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {facets.slice(0, 3).map((facet) => (
              <span
                key={facet.title}
                className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-border-subtle)] text-[var(--color-fg-muted)]"
              >
                {facet.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
