import { db } from '@symploke/db'
import { WeavesClient } from './WeavesClient'

type WeavesPageProps = {
  params: Promise<{ id: string }>
}

export default async function WeavesPage({ params }: WeavesPageProps) {
  const { id } = await params

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

  // Get all weaves for this plexus (excluding dismissed)
  const weaves = await db.weave.findMany({
    where: {
      plexusId: id,
      dismissed: false,
    },
    include: {
      sourceRepo: { select: { name: true, fullName: true } },
      targetRepo: { select: { name: true, fullName: true } },
    },
    orderBy: {
      score: 'desc',
    },
  })

  return <WeavesClient weaves={weaves} discoveryRuns={discoveryRuns} plexusId={id} />
}
