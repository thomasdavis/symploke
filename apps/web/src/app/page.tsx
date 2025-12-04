import { Button } from '@symploke/ui/Button/Button'
import { auth, signIn } from '@/lib/auth'

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    // Redirect to dashboard if logged in
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8">
        <div className="text-center">
          <h1 className="font-sen text-4xl font-bold text-foreground mb-4">
            Welcome back, {session.user.name}!
          </h1>
          <p className="text-muted-foreground mb-8">Your dashboard is coming soon.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="font-sen text-6xl font-bold leading-tight text-foreground sm:text-7xl lg:text-8xl">
            Your projects should
            <br />
            <span className="text-primary">talk to each other</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-xl text-muted-foreground">
            The best code already exists — it's just scattered across your team's repos, waiting to
            be found.
          </p>
          <div className="mt-12">
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
      <section className="border-t border-border bg-muted/30 py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-6 text-lg leading-relaxed text-foreground">
            <p>
              Developers shouldn't have to reinvent what their teammates already solved. When
              you're deep in your own work, you can't see that someone two repos over is wrestling
              with the same auth flow, building the same date picker, or solving the same edge case
              you'll hit next week.
            </p>
            <p>
              <span className="font-semibold">Symploke</span> weaves your team's projects together,
              using AI to surface the connections hiding in plain sight — the shared modules worth
              extracting, the integrations waiting to happen, the patterns that want to converge.
            </p>
            <p>
              It's not about tracking or managing; it's about making the invisible threads between
              your work visible, so you can build together even when you're building apart.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-sen text-center text-4xl font-bold text-foreground mb-16">
            Find what you're both building
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            συμπλοκή (symplokē)
          </p>
          <p className="mt-2 text-lg text-foreground">Greek for "interweaving, entanglement"</p>
          <p className="mt-2 text-sm text-muted-foreground">
            From <span className="italic">sym-</span> (together) +{' '}
            <span className="italic">plokē</span> (weaving, braiding)
          </p>
          <p className="mt-4 text-foreground">The intertwining of things that belong together.</p>
        </div>
      </section>
    </main>
  )
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-6">
      <h3 className="font-sen text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
