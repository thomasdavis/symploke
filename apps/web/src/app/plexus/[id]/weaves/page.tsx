import { db } from '@symploke/db'
import { WeavesClient } from './WeavesClient'

type WeavesPageProps = {
  params: Promise<{ id: string }>
}

export default async function WeavesPage({ params }: WeavesPageProps) {
  const { id } = await params

  // Fetch initial data server-side in parallel
  const [repos, discoveryRuns, weaves] = await Promise.all([
    db.repo.findMany({
      where: { plexusId: id },
      include: {
        _count: {
          select: { files: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),

    db.weaveDiscoveryRun.findMany({
      where: {
        plexusId: id,
        status: 'COMPLETED',
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 20,
    }),

    db.weave.findMany({
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
    }),
  ])

  return <WeavesClient plexusId={id} initialData={{ repos, weaves, discoveryRuns }} />
}
