'use client'

import { useState } from 'react'
import { VirtualFilesTable } from '@symploke/ui/FilesTable/FilesTable'
import type { File } from '@symploke/ui/FilesTable/FilesTable'
import { useInfinitePagination } from '@/hooks/useInfinitePagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { PaginatedResponse } from '@symploke/types/pagination'

export type FilesPageClientProps = {
  plexusId: string
  initialData: PaginatedResponse<File>
}

export function FilesPageClient({ plexusId, initialData }: FilesPageClientProps) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useInfinitePagination<File>({
      queryKey: ['plexus-files', plexusId],
      endpoint: `/api/plexus/${plexusId}/files`,
      initialData,
      search: debouncedSearch || undefined,
    })

  // Flatten pages into single array
  const files = data?.pages.flatMap((page) => page.items) ?? []
  const totalCount = data?.pages[0]?.totalCount ?? 0

  // isSearching: true when user has typed but debounce hasn't fired yet,
  // or when debounce has fired and we're fetching new results
  const isSearching = search !== debouncedSearch || (debouncedSearch && isFetching)

  return (
    <VirtualFilesTable
      files={files}
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
