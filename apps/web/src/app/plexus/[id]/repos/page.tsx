import { db } from '@symploke/db'
import { ReposPageClient } from './ReposPageClient'

type ReposPageProps = {
  params: Promise<{ id: string }>
}

export default async function ReposPage({ params }: ReposPageProps) {
  const { id } = await params

  const repos = await db.repo.findMany({
    where: { plexusId: id },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <ReposPageClient plexusId={id} repos={repos} />
    </div>
  )
}
