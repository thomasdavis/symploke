import { db } from '@symploke/db'
import { notFound } from 'next/navigation'
import { GlossaryDetailClient } from './GlossaryDetailClient'

type GlossaryPageProps = {
  params: Promise<{ id: string; repoId: string }>
}

// Parse glossary data from DB JSON fields
function parseGlossaryFromDb(glossary: {
  id: string
  status: string
  empirics: unknown
  philosophy: unknown
  poetics: unknown
  futureVision: string | null
  confidence: number | null
  unglossableReason: string | null
  extractedAt: Date | null
}) {
  const empirics = glossary.empirics as Record<string, unknown> | null
  const philosophy = glossary.philosophy as Record<string, unknown> | null
  const poetics = glossary.poetics as Record<string, unknown> | null

  return {
    id: glossary.id,
    status: glossary.status as 'PENDING' | 'EXTRACTING' | 'COMPLETE' | 'FAILED' | 'UNGLOSSABLE',
    purpose: (empirics?.purpose as string) || '',
    features: (empirics?.features as string[]) || [],
    techStack: (empirics?.techStack as string[]) || [],
    targetUsers: (empirics?.targetUsers as string[]) || [],
    kpis: (empirics?.kpis as string[]) || [],
    roadmap: (empirics?.roadmap as string[]) || [],
    values: (philosophy?.values as string[]) || [],
    enemies: (philosophy?.enemies as string[]) || [],
    aesthetic: (poetics?.aesthetic as string) || '',
    confidence: glossary.confidence,
    summary: glossary.futureVision,
    unglossableReason: glossary.unglossableReason,
    extractedAt: glossary.extractedAt?.toISOString() || null,
  }
}

export default async function GlossaryPage({ params }: GlossaryPageProps) {
  const { id: plexusId, repoId } = await params

  // Fetch repo with glossary
  const repo = await db.repo.findFirst({
    where: {
      id: repoId,
      plexusId,
    },
    include: {
      glossary: true,
    },
  })

  if (!repo) {
    notFound()
  }

  const glossaryData = repo.glossary ? parseGlossaryFromDb(repo.glossary) : null

  return (
    <GlossaryDetailClient
      plexusId={plexusId}
      repo={{
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
      }}
      glossary={glossaryData}
    />
  )
}
