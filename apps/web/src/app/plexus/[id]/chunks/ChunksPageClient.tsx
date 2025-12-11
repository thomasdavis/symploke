'use client'

import { useState } from 'react'
import { VirtualChunksTable } from '@symploke/ui/ChunksTable/ChunksTable'
import type { Chunk } from '@symploke/ui/ChunksTable/ChunksTable'
import { useInfinitePagination } from '@/hooks/useInfinitePagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { PaginatedResponse } from '@symploke/types/pagination'

export type ChunksPageClientProps = {
  plexusId: string
  initialData: PaginatedResponse<Chunk>
}

export function ChunksPageClient({ plexusId, initialData }: ChunksPageClientProps) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useInfinitePagination<Chunk>({
      queryKey: ['plexus-chunks', plexusId],
      endpoint: `/api/plexus/${plexusId}/chunks`,
      initialData,
      search: debouncedSearch || undefined,
    })

  // Flatten pages into single array
  const chunks = data?.pages.flatMap((page) => page.items) ?? []
  const totalCount = data?.pages[0]?.totalCount ?? 0

  // isSearching: true when user has typed but debounce hasn't fired yet,
  // or when debounce has fired and we're fetching new results
  const isSearching = search !== debouncedSearch || (debouncedSearch && isFetching)

  return (
    <VirtualChunksTable
      chunks={chunks}
      totalCount={totalCount}
      hasMore={hasNextPage ?? false}
      onLoadMore={() => fetchNextPage()}
      isLoadingMore={isFetchingNextPage}
      toolbar={{
        search,
        onSearchChange: setSearch,
        searchPlaceholder: 'Filter by file path...',
        isSearching: Boolean(isSearching),
      }}
    />
  )
}
