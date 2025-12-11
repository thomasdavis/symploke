import { Button } from '@symploke/ui/Button/Button'
import { EmptyState } from '@symploke/ui/EmptyState/EmptyState'
import { auth, signIn } from '@/lib/auth'
import { db } from '@symploke/db'
import Link from 'next/link'
import './page.css'

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    // Get all plexuses the user belongs to
    const userPlexuses = await db.plexusMember.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        plexus: true,
      },
    })

    // If user doesn't have any plexuses, show empty state
    if (userPlexuses.length === 0) {
      return (
        <main>
          <EmptyState
            title="Create Your First Plexus"
            description="A plexus (Greek: πλέξις - 'braiding, weaving') is where your team's repositories intertwine. In Symploke, it's the network that weaves your projects together—revealing shared patterns, integration opportunities, and the invisible threads connecting your work."
            actionLabel="Create Plexus"
            actionHref="/plexus/create"
          />
        </main>
      )
    }

    // User has plexuses, show list
    return (
      <main className="welcome-main">
        <div className="welcome-content">
          <h1 className="welcome-title">Welcome back, {session.user.name}!</h1>
          <div className="plexus-list">
            <h2 className="plexus-list-title">Your Plexuses</h2>
            <div className="plexus-items">
              {userPlexuses.map((member) => (
                <Link
                  key={member.plexus.id}
                  href={`/plexus/${member.plexus.id}/weaves`}
                  className="plexus-link"
                >
                  <h3 className="plexus-name">{member.plexus.name}</h3>
                </Link>
              ))}
            </div>
            <div className="plexus-actions">
              <Link href="/plexus/create">
                <Button variant="secondary">Create New Plexus</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="home-main">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Your projects should
            <br />
            <span className="hero-title-accent">talk to each other</span>
          </h1>
          <p className="hero-description">
            The best code already exists — it's just scattered across your team's repos, waiting to
            be found.
          </p>
          <div className="hero-cta">
            <form
              action={async () => {
                'use server'
                await signIn('github')
              }}
            >
              <Button type="submit" size="lg">
                Sign in with GitHub
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="mission-content">
          <div className="mission-text">
            <p>
              Developers shouldn't have to reinvent what their teammates already solved. When you're
              deep in your own work, you can't see that someone two repos over is wrestling with the
              same auth flow, building the same date picker, or solving the same edge case you'll
              hit next week.
            </p>
            <p>
              <span style={{ fontWeight: 600 }}>Symploke</span> weaves your team's projects
              together, using AI to surface the connections hiding in plain sight — the shared
              modules worth extracting, the integrations waiting to happen, the patterns that want
              to converge.
            </p>
            <p>
              It's not about tracking or managing; it's about making the invisible threads between
              your work visible, so you can build together even when you're building apart.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="features-container">
          <h2 className="features-title">Find what you're both building</h2>
          <div className="features-grid">
            <Feature
              title="Shared modules"
              description="Find the component you're both building separately. Build it once, use it everywhere."
            />
            <Feature
              title="Integration opportunities"
              description="Spot connections between projects before you think of them. Your API and their client, waiting to meet."
            />
            <Feature
              title="Dependency insights"
              description="Get alerts when multiple projects need the same library. Coordinate upgrades, share solutions."
            />
            <Feature
              title="Code reuse"
              description="Dead code in one repo might be exactly what another needs. Surface the overlooked gems."
            />
            <Feature
              title="Pattern convergence"
              description="See where similar patterns are emerging. Extract them before they diverge."
            />
            <Feature
              title="Cross-project refactors"
              description="Find opportunities to improve code across your entire team, not just one repo at a time."
            />
          </div>
        </div>
      </section>

      {/* Etymology */}
      <section className="etymology-section">
        <div className="etymology-content">
          <p className="etymology-label">συμπλοκή (symplokē)</p>
          <p className="etymology-meaning">Greek for "interweaving, entanglement"</p>
          <p className="etymology-parts">
            From <span style={{ fontStyle: 'italic' }}>sym-</span> (together) +{' '}
            <span style={{ fontStyle: 'italic' }}>plokē</span> (weaving, braiding)
          </p>
          <p className="etymology-definition">The intertwining of things that belong together.</p>
        </div>
      </section>
    </main>
  )
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="feature-card">
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  )
}
