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
    </>
  )
}
