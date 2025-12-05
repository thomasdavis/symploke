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

  if (!repo) {
    notFound()
  }

  // Get latest sync job if any
  const latestJob = await db.repoSyncJob.findFirst({
    where: { repoId },
    orderBy: { createdAt: 'desc' },
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
      }}
      latestJob={
        latestJob
          ? {
              id: latestJob.id,
              status: latestJob.status,
              totalFiles: latestJob.totalFiles,
              processedFiles: latestJob.processedFiles,
              skippedFiles: latestJob.skippedFiles,
              failedFiles: latestJob.failedFiles,
              error: latestJob.error,
              startedAt: latestJob.startedAt,
              completedAt: latestJob.completedAt,
              createdAt: latestJob.createdAt,
            }
          : null
      }
    />
  )
}
