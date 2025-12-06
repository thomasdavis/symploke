'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@symploke/ui/Button/Button'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { MembersTable } from '@symploke/ui/MembersTable/MembersTable'
import { AddMemberDialog } from '@symploke/ui/AddMemberDialog/AddMemberDialog'

type Member = {
  userId: string
  role: string
  user: {
    name: string | null
    email: string
    image: string | null
  }
}

type MembersPageClientProps = {
  plexusId: string
  initialMembers: Member[]
}

export function MembersPageClient({ plexusId, initialMembers }: MembersPageClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: membersData } = useQuery({
    queryKey: ['plexus-members', plexusId],
    queryFn: async () => {
      const response = await fetch(`/api/plexus/${plexusId}/members`)
      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }
      return response.json() as Promise<{ members: Member[] }>
    },
    initialData: { members: initialMembers },
  })

  const members = membersData?.members ?? initialMembers

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <PageHeader
        title="Members"
        actions={
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            Add Member
          </Button>
        }
      />
      <MembersTable members={members} />
      <AddMemberDialog plexusId={plexusId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
