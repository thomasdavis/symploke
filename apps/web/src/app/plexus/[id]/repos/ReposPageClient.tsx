'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@symploke/ui/Button/Button'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { ReposTable } from '@symploke/ui/ReposTable/ReposTable'
import { AddRepoDialog } from '@symploke/ui/AddRepoDialog/AddRepoDialog'
import { DeleteRepoDialog } from '@symploke/ui/DeleteRepoDialog/DeleteRepoDialog'
import { useSyncProgress } from '@/hooks/useSyncProgress'
import { useEmbedProgress } from '@/hooks/useEmbedProgress'
import type { Repo, SyncStatus, EmbedStatus } from '@symploke/ui/ReposTable/ReposTable'

export type ReposPageClientProps = {
  plexusId: string
  repos: Repo[]
}

export function ReposPageClient({ plexusId, repos: initialRepos }: ReposPageClientProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ repoId: string; repoName: string } | null>(
    null,
  )
  const queryClient = useQueryClient()
  const { getSyncStatus, isSyncing, triggerSync } = useSyncProgress(plexusId)
  const { getEmbedStatus, isEmbedding, triggerEmbed } = useEmbedProgress(plexusId)

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

  const getSyncStatusForRepo = (repoId: string): SyncStatus | undefined => {
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

  const getEmbedStatusForRepo = (repoId: string): EmbedStatus | undefined => {
    const status = getEmbedStatus(repoId)
    if (!status) return undefined
    return {
      status: status.status,
      processedFiles: status.processedFiles,
      totalFiles: status.totalFiles,
      chunksCreated: status.chunksCreated,
      embeddingsGenerated: status.embeddingsGenerated,
      error: status.error,
    }
  }

  const handleSync = async (repoId: string) => {
    try {
      await triggerSync(repoId)
      // Refetch repos after sync completes to update status
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['plexus-repos', plexusId] })
      }, 2000)
    } catch (error) {
      console.error('Failed to trigger sync:', error)
    }
  }

  const handleEmbed = async (repoId: string) => {
    try {
      await triggerEmbed(repoId)
      // Refetch repos after embed completes to update status
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['plexus-repos', plexusId] })
      }, 2000)
    } catch (error) {
      console.error('Failed to trigger embedding:', error)
    }
  }

  // Generate href for repo detail page
  const getRepoHref = (repoId: string): string => {
    return `/plexus/${plexusId}/repos/${repoId}`
  }

  // Handle delete - open confirmation dialog
  const handleDelete = (repoId: string, repoName: string) => {
    setDeleteTarget({ repoId, repoName })
  }

  return (
    <>
      <PageHeader
        title="Repositories"
        actions={
          <Button variant="primary" onClick={() => setIsAddDialogOpen(true)}>
            Add Repository
          </Button>
        }
      />
      <ReposTable
        repos={repos}
        plexusId={plexusId}
        onSync={handleSync}
        onEmbed={handleEmbed}
        onDelete={handleDelete}
        getSyncStatus={getSyncStatusForRepo}
        getEmbedStatus={getEmbedStatusForRepo}
        isSyncing={isSyncing}
        isEmbedding={isEmbedding}
        getRepoHref={getRepoHref}
      />
      <AddRepoDialog plexusId={plexusId} open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      <DeleteRepoDialog
        plexusId={plexusId}
        repoId={deleteTarget?.repoId ?? null}
        repoName={deleteTarget?.repoName ?? null}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      />
    </>
  )
}
