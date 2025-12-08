import { db } from '@symploke/db'
import { notFound } from 'next/navigation'
import { PairDrillDownClient } from './PairDrillDownClient'

type PairDrillDownPageProps = {
  params: Promise<{
    id: string
    runId: string
    sourceRepoId: string
    targetRepoId: string
  }>
}

type LogEntry = {
  timestamp: string
  level: 'info' | 'debug' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

export default async function PairDrillDownPage({ params }: PairDrillDownPageProps) {
  const { id: plexusId, runId, sourceRepoId, targetRepoId } = await params

  // Fetch the discovery run
  const run = await db.weaveDiscoveryRun.findFirst({
    where: {
      id: runId,
      plexusId,
    },
  })

  if (!run) {
    notFound()
  }

  // Fetch both repos
  const [sourceRepo, targetRepo] = await Promise.all([
    db.repo.findFirst({
      where: { id: sourceRepoId, plexusId },
      include: { glossary: true },
    }),
    db.repo.findFirst({
      where: { id: targetRepoId, plexusId },
      include: { glossary: true },
    }),
  ])

  if (!sourceRepo || !targetRepo) {
    notFound()
  }

  // Fetch any weaves created between these repos in this run
  const weaves = await db.weave.findMany({
    where: {
      discoveryRunId: runId,
      OR: [
        { sourceRepoId, targetRepoId },
        { sourceRepoId: targetRepoId, targetRepoId: sourceRepoId },
      ],
    },
  })

  // Filter logs for this specific pair
  const allLogs = (run.logs as LogEntry[]) || []
  const pairLogs = allLogs.filter((log) => {
    if (!log.data) return false
    const data = log.data
    return (
      (data.sourceRepoId === sourceRepoId && data.targetRepoId === targetRepoId) ||
      (data.sourceRepoId === targetRepoId && data.targetRepoId === sourceRepoId)
    )
  })

  // Serialize data for client
  const serializeGlossary = (glossary: typeof sourceRepo.glossary) => {
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
        virtues: string[]
        epistemology: string
      },
      resentments: glossary.resentments as {
        hates: string[]
        definesAgainst: string[]
        enemies: string[]
      },
      confidence: glossary.confidence,
    }
  }

  return (
    <PairDrillDownClient
      plexusId={plexusId}
      run={{
        id: run.id,
        status: run.status,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() || null,
      }}
      sourceRepo={{
        id: sourceRepo.id,
        name: sourceRepo.name,
        fullName: sourceRepo.fullName,
        glossary: serializeGlossary(sourceRepo.glossary),
      }}
      targetRepo={{
        id: targetRepo.id,
        name: targetRepo.name,
        fullName: targetRepo.fullName,
        glossary: serializeGlossary(targetRepo.glossary),
      }}
      logs={pairLogs}
      weaves={weaves.map((w) => ({
        id: w.id,
        type: w.type,
        title: w.title,
        score: w.score,
        createdAt: w.createdAt.toISOString(),
      }))}
    />
  )
}
