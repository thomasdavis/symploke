import { db } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { RepoFlowGraph } from './RepoFlowGraph'

type DashboardPageProps = {
  params: Promise<{ id: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { id } = await params

  // Get all repos for this plexus with file counts
  const repos = await db.repo.findMany({
    where: { plexusId: id },
    include: {
      _count: {
        select: { files: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="dashboard-page">
      <PageHeader title="Dashboard" subtitle={`${repos.length} repositories`} />
      <RepoFlowGraph repos={repos} plexusId={id} />
    </div>
  )
}
