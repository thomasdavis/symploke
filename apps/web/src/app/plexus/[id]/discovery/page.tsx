import { db } from '@symploke/db'
import { DiscoveryPageClient } from './DiscoveryPageClient'

export default async function DiscoveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const runs = await db.weaveDiscoveryRun.findMany({
    where: { plexusId: id },
    orderBy: { startedAt: 'desc' },
    take: 50,
  })

  return <DiscoveryPageClient plexusId={id} runs={runs} />
}
