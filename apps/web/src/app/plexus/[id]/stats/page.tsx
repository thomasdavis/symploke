import { db } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { StatsClient } from './StatsClient'
import './stats.css'

type StatsPageProps = {
  params: Promise<{ id: string }>
}

export default async function StatsPage({ params }: StatsPageProps) {
  const { id } = await params

  // Get the most recent completed run
  const lastRun = await db.weaveDiscoveryRun.findFirst({
    where: { plexusId: id, status: 'COMPLETED' },
    orderBy: { startedAt: 'desc' },
  })

  // Get all repos in the plexus
  const repos = await db.repo.findMany({
    where: { plexusId: id },
    select: { id: true, name: true },
  })

  // Get all weaves for this plexus
  const allWeaves = await db.weave.findMany({
    where: { plexusId: id },
    select: {
      id: true,
      sourceRepoId: true,
      targetRepoId: true,
      type: true,
      score: true,
      discoveryRunId: true,
    },
  })

  // Format last run date
  const lastRunDate = lastRun
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(lastRun.startedAt)
    : null

  return (
    <div className="stats-page">
      <PageHeader title="Stats" subtitle="Leaderboard and analytics for weave discovery" />
      <StatsClient
        weaves={allWeaves}
        repos={repos}
        lastRunId={lastRun?.id ?? null}
        lastRunDate={lastRunDate}
      />
    </div>
  )
}
