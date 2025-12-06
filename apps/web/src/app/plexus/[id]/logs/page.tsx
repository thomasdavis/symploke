import { db } from '@symploke/db'
import { LogsClient } from './LogsClient'

type LogEntry = {
  timestamp: string
  level: 'info' | 'debug' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

type ActivityLog = {
  id: string
  type: 'sync' | 'embed' | 'discovery'
  status: string
  repoName?: string
  startedAt: Date
  completedAt: Date | null
  logs: LogEntry[]
  summary: {
    processedFiles?: number
    totalFiles?: number
    skippedFiles?: number
    failedFiles?: number
    chunksCreated?: number
    embeddingsGenerated?: number
    weavesSaved?: number
    candidatesFound?: number
  }
}

export default async function LogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Fetch recent sync jobs
  const syncJobs = await db.repoSyncJob.findMany({
    where: { repo: { plexusId: id } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { repo: { select: { name: true, fullName: true } } },
  })

  // Fetch recent embed jobs
  const embedJobs = await db.chunkSyncJob.findMany({
    where: { repo: { plexusId: id } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { repo: { select: { name: true, fullName: true } } },
  })

  // Fetch recent discovery runs
  const discoveryRuns = await db.weaveDiscoveryRun.findMany({
    where: { plexusId: id },
    orderBy: { startedAt: 'desc' },
    take: 20,
  })

  // Transform sync jobs to activity logs
  const syncLogs: ActivityLog[] = syncJobs.map((job) => ({
    id: job.id,
    type: 'sync' as const,
    status: job.status,
    repoName: job.repo.fullName,
    startedAt: job.startedAt || job.createdAt,
    completedAt: job.completedAt,
    logs: [],
    summary: {
      processedFiles: job.processedFiles,
      totalFiles: job.totalFiles ?? undefined,
      skippedFiles: job.skippedFiles,
      failedFiles: job.failedFiles,
    },
  }))

  // Transform embed jobs to activity logs
  const embedLogs: ActivityLog[] = embedJobs.map((job) => ({
    id: job.id,
    type: 'embed' as const,
    status: job.status,
    repoName: job.repo.fullName,
    startedAt: job.startedAt || job.createdAt,
    completedAt: job.completedAt,
    logs: [],
    summary: {
      processedFiles: job.processedFiles,
      totalFiles: job.totalFiles ?? undefined,
      chunksCreated: job.chunksCreated,
      embeddingsGenerated: job.embeddingsGenerated,
    },
  }))

  // Transform discovery runs to activity logs
  const discoveryLogs: ActivityLog[] = discoveryRuns.map((run) => ({
    id: run.id,
    type: 'discovery' as const,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    logs: (run.logs as LogEntry[]) || [],
    summary: {
      candidatesFound: run.candidatesFound,
      weavesSaved: run.weavesSaved,
    },
  }))

  // Combine and sort by start time
  const allLogs = [...syncLogs, ...embedLogs, ...discoveryLogs].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )

  return <LogsClient plexusId={id} initialLogs={allLogs} />
}
