import { db } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { ChunksTable } from '@symploke/ui/ChunksTable/ChunksTable'

type ChunksPageProps = {
  params: Promise<{ id: string }>
}

export default async function ChunksPage({ params }: ChunksPageProps) {
  const { id } = await params

  const chunks = await db.chunk.findMany({
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
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  })

  const embeddedCount = chunks.filter((c) => c.embeddedAt !== null).length

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      <PageHeader
        title="Chunks"
        subtitle={`${chunks.length.toLocaleString()} chunks (${embeddedCount} embedded)`}
      />
      <ChunksTable chunks={chunks} />
    </div>
  )
}
