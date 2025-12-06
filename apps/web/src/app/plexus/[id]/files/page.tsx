import { db } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { FilesTable } from '@symploke/ui/FilesTable/FilesTable'

type FilesPageProps = {
  params: Promise<{ id: string }>
}

export default async function FilesPage({ params }: FilesPageProps) {
  const { id } = await params

  // Get all files from repos belonging to this plexus
  const files = await db.file.findMany({
    where: {
      repo: {
        plexusId: id,
      },
    },
    include: {
      repo: {
        select: {
          name: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <PageHeader title="Files" subtitle={`${files.length.toLocaleString()} files synced`} />
      <FilesTable files={files} />
    </div>
  )
}
