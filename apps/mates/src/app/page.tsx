import { SubmitForm } from '@/components/SubmitForm'
import { RecentLookups } from '@/components/RecentLookups'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className="flex flex-col items-center gap-6 max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Find your <span className="mates-gradient">coding mates</span>
        </h1>
        <p className="text-lg text-[var(--color-fg-muted)] max-w-md">
          Enter your GitHub username. We&apos;ll analyze your code, build your developer profile,
          and match you with like-minded developers.
        </p>
        <SubmitForm />
        <RecentLookups />
      </div>
    </div>
  )
}
