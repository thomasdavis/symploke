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
  // Extract v2 fields from v1 JSON columns (empirics, philosophy, poetics)
  const serializeGlossary = (glossary: typeof weave.sourceRepo.glossary) => {
    if (!glossary) return null

    const empirics = glossary.empirics as Record<string, unknown> | null
    const philosophy = glossary.philosophy as Record<string, unknown> | null
    const poetics = glossary.poetics as Record<string, unknown> | null

    return {
      id: glossary.id,
      status: glossary.status,
      // Practical (from empirics)
      purpose: (empirics?.purpose as string) || null,
      features: (empirics?.features as string[]) || null,
      techStack: (empirics?.techStack as string[]) || null,
      targetUsers: (empirics?.targetUsers as string[]) || null,
      kpis: (empirics?.kpis as string[]) || null,
      roadmap: (empirics?.roadmap as string[]) || null,
      // Philosophical (from philosophy)
      values: (philosophy?.values as string[]) || null,
      enemies: (philosophy?.enemies as string[]) || null,
      // Poetic (from poetics)
      aesthetic: (poetics?.aesthetic as string) || null,
      // Meta
      confidence: glossary.confidence,
      summary: glossary.futureVision,
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
