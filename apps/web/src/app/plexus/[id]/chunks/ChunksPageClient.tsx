'use client'

import { VirtualChunksTable } from '@symploke/ui/ChunksTable/ChunksTable'
import type { Chunk } from '@symploke/ui/ChunksTable/ChunksTable'
import { useInfinitePagination } from '@/hooks/useInfinitePagination'
import type { PaginatedResponse } from '@symploke/types/pagination'

export type ChunksPageClientProps = {
  plexusId: string
  initialData: PaginatedResponse<Chunk>
}

export function ChunksPageClient({ plexusId, initialData }: ChunksPageClientProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfinitePagination<Chunk>({
    queryKey: ['plexus-chunks', plexusId],
    endpoint: `/api/plexus/${plexusId}/chunks`,
    initialData,
  })

  // Flatten pages into single array
  const chunks = data?.pages.flatMap((page) => page.items) ?? []
  const totalCount = data?.pages[0]?.totalCount ?? 0

  return (
    <VirtualChunksTable
      chunks={chunks}
      totalCount={totalCount}
      hasMore={hasNextPage ?? false}
      onLoadMore={() => fetchNextPage()}
      isLoadingMore={isFetchingNextPage}
    />
  )
}
