'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@symploke/ui/Button/Button'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { ReposTable } from '@symploke/ui/ReposTable/ReposTable'
import { AddRepoDialog } from '@symploke/ui/AddRepoDialog/AddRepoDialog'
import type { Repo } from '@symploke/ui/ReposTable/ReposTable'

export type ReposPageClientProps = {
  plexusId: string
  repos: Repo[]
}

export function ReposPageClient({ plexusId, repos }: ReposPageClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  // Pre-populate the cache with the server-fetched repos
  queryClient.setQueryData(['plexus-repos', plexusId], repos)

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
      <ReposTable repos={repos} />
      <AddRepoDialog plexusId={plexusId} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  )
}
