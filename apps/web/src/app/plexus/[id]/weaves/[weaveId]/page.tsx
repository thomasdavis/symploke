import { db } from '@symploke/db'
import { notFound } from 'next/navigation'
import { WeaveDetailClient } from './WeaveDetailClient'

type WeaveDetailPageProps = {
  params: Promise<{ id: string; weaveId: string }>
}

export default async function WeaveDetailPage({ params }: WeaveDetailPageProps) {
  const { id: plexusId, weaveId } = await params

  // Fetch weave with all related data
  const weave = await db.weave.findFirst({
    where: {
      id: weaveId,
      plexusId,
    },
    include: {
      sourceRepo: {
        include: {
          glossary: true,
        },
      },
      targetRepo: {
        include: {
          glossary: true,
        },
      },
      discoveryRun: true,
      comments: {
        include: {
          user: {
            select: { name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!weave) {
    notFound()
  }

  // Serialize the data for client component
  const serializeGlossary = (glossary: typeof weave.sourceRepo.glossary) => {
    if (!glossary) return null
    return {
      id: glossary.id,
      status: glossary.status,
      terms: glossary.terms as Array<{
        term: string
        definition: string
        context: string
        emotionalValence: string
      }>,
      philosophy: glossary.philosophy as {
        beliefs: string[]
        assumptions: string[]
        virtues: string[]
        epistemology: string
        ontology: string
        teleology: string
      },
      psychology: glossary.psychology as {
        fears: string[]
        confidences: string[]
        defenses: string[]
        attachments: string[]
        blindSpots: string[]
      },
      resentments: glossary.resentments as {
        hates: string[]
        definesAgainst: string[]
        allergies: string[]
        warnings: string[]
        enemies: string[]
      },
      poetics: glossary.poetics as {
        metaphors: string[]
        namingPatterns: string[]
        aesthetic: string
        rhythm: string
        voice: string
      },
      empirics: glossary.empirics as {
        measures: string[]
        evidenceTypes: string[]
        truthClaims: string[]
        uncertainties: string[]
      },
      futureVision: glossary.futureVision,
      confidence: glossary.confidence,
    }
  }

  const weaveData = {
    id: weave.id,
    type: weave.type,
    title: weave.title,
    description: weave.description,
    score: weave.score,
    dismissed: weave.dismissed,
    metadata: weave.metadata as Record<string, unknown> | null,
    createdAt: weave.createdAt.toISOString(),
    sourceRepo: {
      id: weave.sourceRepo.id,
      name: weave.sourceRepo.name,
      fullName: weave.sourceRepo.fullName,
      url: weave.sourceRepo.url,
      glossary: serializeGlossary(weave.sourceRepo.glossary),
    },
    targetRepo: {
      id: weave.targetRepo.id,
      name: weave.targetRepo.name,
      fullName: weave.targetRepo.fullName,
      url: weave.targetRepo.url,
      glossary: serializeGlossary(weave.targetRepo.glossary),
    },
    discoveryRun: weave.discoveryRun
      ? {
          id: weave.discoveryRun.id,
          status: weave.discoveryRun.status,
          startedAt: weave.discoveryRun.startedAt.toISOString(),
        }
      : null,
    comments: weave.comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
    })),
  }

  return <WeaveDetailClient plexusId={plexusId} weave={weaveData} />
}
