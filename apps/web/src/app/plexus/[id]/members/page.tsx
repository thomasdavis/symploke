import { db } from '@symploke/db'
import { Button } from '@symploke/ui/Button/Button'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { MembersTable } from '@symploke/ui/MembersTable/MembersTable'

type MembersPageProps = {
  params: Promise<{ id: string }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { id } = await params

  const members = await db.plexusMember.findMany({
    where: { plexusId: id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      role: 'asc',
    },
  })

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <PageHeader
        title="Members"
        actions={
          <Button variant="primary" disabled>
            Add Member
          </Button>
        }
      />
      <MembersTable members={members} />
    </div>
  )
}
