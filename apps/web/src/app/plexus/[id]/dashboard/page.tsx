import { db } from '@symploke/db'
import { DashboardClient } from './DashboardClient'

type DashboardPageProps = {
  params: Promise<{ id: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { id } = await params

  // Get all repos for this plexus with file counts
  const repos = await db.repo.findMany({
    where: { plexusId: id },
    include: {
      _count: {
        select: { files: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Get discovery runs (completed only)
  const discoveryRuns = await db.weaveDiscoveryRun.findMany({
    where: {
      plexusId: id,
      status: 'COMPLETED',
    },
    orderBy: {
      startedAt: 'desc',
    },
    take: 20,
  })

  // Get all weaves for this plexus (excluding dismissed), grouped by run
  const weaves = await db.weave.findMany({
    where: {
      plexusId: id,
      dismissed: false,
    },
    include: {
      sourceRepo: { select: { name: true } },
      targetRepo: { select: { name: true } },
    },
    orderBy: {
      score: 'desc',
    },
  })

  return (
    <DashboardClient repos={repos} weaves={weaves} discoveryRuns={discoveryRuns} plexusId={id} />
  )
}
