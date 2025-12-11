import { db } from '@symploke/db'
import { notFound } from 'next/navigation'
import { RepoDetailClient } from './RepoDetailClient'

type RepoDetailPageProps = {
  params: Promise<{ id: string; repoId: string }>
}

export default async function RepoDetailPage({ params }: RepoDetailPageProps) {
  const { id: plexusId, repoId } = await params

  const repo = await db.repo.findFirst({
    where: {
      id: repoId,
      plexusId,
    },
    include: {
      _count: {
        select: { files: true },
      },
    },
  })

  // Count chunks separately (chunks are on files, not directly on repo)
  const chunkCount = repo
    ? await db.chunk.count({
        where: {
          file: { repoId: repo.id },
        },
      })
    : 0

  if (!repo) {
    notFound()
  }

  // Get all sync jobs (most recent first)
  const syncJobs = await db.repoSyncJob.findMany({
    where: { repoId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Get all embed jobs (most recent first)
  const embedJobs = await db.chunkSyncJob.findMany({
    where: { repoId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <RepoDetailClient
      plexusId={plexusId}
      repo={{
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        url: repo.url,
        defaultBranch: repo.defaultBranch,
        lastIndexed: repo.lastIndexed,
        fileCount: repo._count.files,
        chunkCount,
      }}
      syncJobs={syncJobs.map((job) => ({
        id: job.id,
        status: job.status,
        totalFiles: job.totalFiles,
        processedFiles: job.processedFiles,
        skippedFiles: job.skippedFiles,
        failedFiles: job.failedFiles,
        error: job.error,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      }))}
      embedJobs={embedJobs.map((job) => ({
        id: job.id,
        status: job.status,
        totalFiles: job.totalFiles,
        processedFiles: job.processedFiles,
        chunksCreated: job.chunksCreated,
        embeddingsGenerated: job.embeddingsGenerated,
        skippedFiles: job.skippedFiles,
        failedFiles: job.failedFiles,
        error: job.error,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      }))}
    />
  )
}
