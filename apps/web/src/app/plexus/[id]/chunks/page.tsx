import { db } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { ChunksPageClient } from './ChunksPageClient'
import type { PaginatedResponse } from '@symploke/types/pagination'
import type { Chunk } from '@symploke/ui/ChunksTable/ChunksTable'

type ChunksPageProps = {
  params: Promise<{ id: string }>
}

const PAGE_SIZE = 50

export default async function ChunksPage({ params }: ChunksPageProps) {
  const { id } = await params

  // Fetch first page of chunks and total count in parallel
  const [chunks, totalCount] = await Promise.all([
    db.chunk.findMany({
      where: {
        file: {
          repo: {
            plexusId: id,
          },
        },
      },
      include: {
        file: {
          select: {
            path: true,
            repo: {
              select: {
                name: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
    }),
    db.chunk.count({
      where: {
        file: {
          repo: {
            plexusId: id,
          },
        },
      },
    }),
  ])

  // Determine if there are more items
  const hasMore = chunks.length > PAGE_SIZE
  const items = hasMore ? chunks.slice(0, -1) : chunks
  const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null

  // Count embedded chunks in initial data
  const embeddedCount = items.filter((c) => c.embeddedAt !== null).length

  const initialData: PaginatedResponse<Chunk> = {
    items: items as Chunk[],
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
      <PageHeader
        title="Chunks"
        subtitle={`${totalCount.toLocaleString()} chunks (${embeddedCount} of ${items.length} shown embedded)`}
      />
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChunksPageClient plexusId={id} initialData={initialData} />
      </div>
    </div>
  )
}
