import { db } from '@symploke/db'
import { notFound } from 'next/navigation'
import { GlossaryDetailClient } from './GlossaryDetailClient'

type GlossaryPageProps = {
  params: Promise<{ id: string; repoId: string }>
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

  // Serialize dates and data for client component
  const glossaryData = repo.glossary
    ? {
        id: repo.glossary.id,
        status: repo.glossary.status,
        terms: repo.glossary.terms as Array<{
          term: string
          definition: string
          context: string
          emotionalValence: string
        }>,
        empirics: repo.glossary.empirics as {
          measures: string[]
          evidenceTypes: string[]
          truthClaims: string[]
          uncertainties: string[]
        },
        psychology: repo.glossary.psychology as {
          fears: string[]
          confidences: string[]
          defenses: string[]
          attachments: string[]
          blindSpots: string[]
        },
        poetics: repo.glossary.poetics as {
          metaphors: string[]
          namingPatterns: string[]
          aesthetic: string
          rhythm: string
          voice: string
        },
        philosophy: repo.glossary.philosophy as {
          beliefs: string[]
          assumptions: string[]
          virtues: string[]
          epistemology: string
          ontology: string
          teleology: string
        },
        resentments: repo.glossary.resentments as {
          hates: string[]
          definesAgainst: string[]
          allergies: string[]
          warnings: string[]
          enemies: string[]
        },
        futureVision: repo.glossary.futureVision,
        confidence: repo.glossary.confidence,
        unglossableReason: repo.glossary.unglossableReason,
        extractedAt: repo.glossary.extractedAt?.toISOString() || null,
      }
    : null

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
