import { Separator } from '@symploke/ui/Separator/Separator'
import { RecentLookups } from '@/components/RecentLookups'
import { SubmitForm } from '@/components/SubmitForm'

export default function HomePage() {
  return (
    <>
      <section className="mates-hero">
        <h1 className="mates-hero-title">
          Find your <span className="mates-hero-accent">coding mates</span>
        </h1>
        <p className="mates-hero-description">
          Enter your GitHub username. We&apos;ll analyze your code, build your developer profile,
          and match you with like-minded developers.
        </p>
        <div className="mates-hero-form">
          <SubmitForm />
        </div>
      </section>

      <RecentLookups />

      <section className="mates-how-section">
        <div className="mates-how-inner">
          <Separator />
          <h2 className="mates-how-heading">How it works</h2>
          <div className="mates-how-grid">
            <div className="mates-how-step">
              <span className="mates-how-step-num">1</span>
              <h3 className="mates-how-step-title">Crawl</h3>
              <p className="mates-how-step-desc">
                We fetch your public GitHub events, PRs, issues, and commit messages from repos
                you&apos;ve touched in the last 90 days.
              </p>
            </div>
            <div className="mates-how-step">
              <span className="mates-how-step-num">2</span>
              <h3 className="mates-how-step-title">Profile</h3>
              <p className="mates-how-step-desc">
                An LLM synthesizes per-repo summaries into a developer profile with semantic facets
                — your tech identity distilled from actual code.
              </p>
            </div>
            <div className="mates-how-step">
              <span className="mates-how-step-num">3</span>
              <h3 className="mates-how-step-title">Embed</h3>
              <p className="mates-how-step-desc">
                Each facet is embedded with <code>text-embedding-3-large</code> and stored in
                pgvector. Chunks, not full profiles — higher signal matching.
              </p>
            </div>
            <div className="mates-how-step">
              <span className="mates-how-step-num">4</span>
              <h3 className="mates-how-step-title">Match</h3>
              <p className="mates-how-step-desc">
                Cosine similarity across all user chunks via HNSW index. Chunk-level scores
                aggregate to user-level matches. Top 20 surfaced per profile.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
