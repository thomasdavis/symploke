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

  // Serialize glossary data for client component
  // Extract fields from JSON columns (empirics, philosophy)
  const serializeGlossary = (glossary: typeof weave.sourceRepo.glossary) => {
    if (!glossary) return null

    const empirics = glossary.empirics as Record<string, unknown> | null
    const philosophy = glossary.philosophy as Record<string, unknown> | null

    return {
      id: glossary.id,
      status: glossary.status,
      // What it is
      purpose: (empirics?.purpose as string) || null,
      category: (empirics?.category as string) || null,
      domain: (empirics?.domain as string) || null,
      // What it provides
      provides: (empirics?.provides as string[]) || null,
      outputs: (empirics?.outputs as string[]) || null,
      apis: (empirics?.apis as string[]) || null,
      // What it needs
      consumes: (empirics?.consumes as string[]) || null,
      dependencies: (empirics?.dependencies as string[]) || null,
      gaps: (empirics?.gaps as string[]) || null,
      // Technical
      techStack: (empirics?.techStack as string[]) || null,
      patterns: (empirics?.patterns as string[]) || null,
      // Philosophy
      values: (philosophy?.values as string[]) || null,
      antipatterns: (philosophy?.antipatterns as string[]) || null,
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
