import { db } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { FilesPageClient } from './FilesPageClient'
import type { PaginatedResponse } from '@symploke/types/pagination'
import type { File } from '@symploke/ui/FilesTable/FilesTable'

type FilesPageProps = {
  params: Promise<{ id: string }>
}

const PAGE_SIZE = 50

export default async function FilesPage({ params }: FilesPageProps) {
  const { id } = await params

  // Fetch first page of files and total count in parallel
  const [files, totalCount] = await Promise.all([
    db.file.findMany({
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
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
    }),
    db.file.count({
      where: {
        repo: {
          plexusId: id,
        },
      },
    }),
  ])

  // Determine if there are more items
  const hasMore = files.length > PAGE_SIZE
  const items = hasMore ? files.slice(0, -1) : files
  const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null

  const initialData: PaginatedResponse<File> = {
    items: items as File[],
    nextCursor,
    totalCount,
    hasMore,
  }

  return (
    <div
      style={{
        padding: 'var(--space-8)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PageHeader title="Files" subtitle={`${totalCount.toLocaleString()} files synced`} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <FilesPageClient plexusId={id} initialData={initialData} />
      </div>
    </div>
  )
}
