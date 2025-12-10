import { db } from '@symploke/db'
import { WeavesClient } from './WeavesClient'

// Force dynamic rendering to always get fresh data
export const dynamic = 'force-dynamic'

type WeavesPageProps = {
  params: Promise<{ id: string }>
}

export default async function WeavesPage({ params }: WeavesPageProps) {
  const { id } = await params

  // Get all repos for this plexus with file counts (for graph view)
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

  // Get all weaves for this plexus (excluding dismissed)
  // Include glossary data for showing breakdowns in glossary_alignment weaves
  const weaves = await db.weave.findMany({
    where: {
      plexusId: id,
      dismissed: false,
    },
    include: {
      sourceRepo: {
        select: {
          name: true,
          fullName: true,
          glossary: {
            select: {
              status: true,
              empirics: true,
              philosophy: true,
              poetics: true,
              futureVision: true,
              confidence: true,
            },
          },
        },
      },
      targetRepo: {
        select: {
          name: true,
          fullName: true,
          glossary: {
            select: {
              status: true,
              empirics: true,
              philosophy: true,
              poetics: true,
              futureVision: true,
              confidence: true,
            },
          },
        },
      },
    },
    orderBy: {
      score: 'desc',
    },
  })

  return <WeavesClient repos={repos} weaves={weaves} discoveryRuns={discoveryRuns} plexusId={id} />
}
