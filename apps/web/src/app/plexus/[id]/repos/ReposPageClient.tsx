'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@symploke/ui/Button/Button'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { ReposTable } from '@symploke/ui/ReposTable/ReposTable'
import { AddRepoDialog } from '@symploke/ui/AddRepoDialog/AddRepoDialog'
import { useSyncProgress } from '@/hooks/useSyncProgress'
import type { Repo, SyncStatus } from '@symploke/ui/ReposTable/ReposTable'

export type ReposPageClientProps = {
  plexusId: string
  repos: Repo[]
}

export function ReposPageClient({ plexusId, repos: initialRepos }: ReposPageClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { getSyncStatus, isSyncing } = useSyncProgress(plexusId)

  // Use React Query with server data as initial data
  const { data: repos } = useQuery({
    queryKey: ['plexus-repos', plexusId],
    queryFn: async () => {
      const response = await fetch(`/api/plexus/${plexusId}/repositories`)
      if (!response.ok) throw new Error('Failed to fetch repositories')
      return response.json() as Promise<Repo[]>
    },
    initialData: initialRepos,
    staleTime: 0, // Always refetch on invalidation
  })

  const getStatus = (repoId: string): SyncStatus | undefined => {
    const status = getSyncStatus(repoId)
    if (!status) return undefined
    return {
      status: status.status,
      processedFiles: status.processedFiles,
      totalFiles: status.totalFiles,
      currentFile: status.currentFile,
      error: status.error,
    }
  }

  // Generate href for repo detail page
  const getRepoHref = (repoId: string): string => {
    return `/plexus/${plexusId}/repos/${repoId}`
  }

  return (
    <>
      <PageHeader
        title="Repositories"
        actions={
          <Button variant="primary" onClick={() => setIsDialogOpen(true)}>
            Add Repository
          </Button>
        }
      />
      <ReposTable
        repos={repos}
        getSyncStatus={getStatus}
        isSyncing={isSyncing}
        getRepoHref={getRepoHref}
      />
      <AddRepoDialog plexusId={plexusId} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  )
}
