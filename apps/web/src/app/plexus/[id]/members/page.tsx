import { db } from '@symploke/db'
import { MembersPageClient } from './MembersPageClient'

type MembersPageProps = {
  params: Promise<{ id: string }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { id } = await params

  const members = await db.plexusMember.findMany({
    where: { plexusId: id },
    select: {
      userId: true,
      role: true,
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

  return <MembersPageClient plexusId={id} initialMembers={members} />
}
