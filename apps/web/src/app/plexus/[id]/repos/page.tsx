import { db } from '@symploke/db'
import { Button } from '@symploke/ui/Button/Button'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { ReposTable } from '@symploke/ui/ReposTable/ReposTable'

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
      <PageHeader
        title="Repositories"
        actions={
          <Button variant="primary" disabled>
            Add Repository
          </Button>
        }
      />
      <ReposTable repos={repos} />
    </div>
  )
}
