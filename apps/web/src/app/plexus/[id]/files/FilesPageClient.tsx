'use client'

import { VirtualFilesTable } from '@symploke/ui/FilesTable/FilesTable'
import type { File } from '@symploke/ui/FilesTable/FilesTable'
import { useInfinitePagination } from '@/hooks/useInfinitePagination'
import type { PaginatedResponse } from '@symploke/types/pagination'

export type FilesPageClientProps = {
  plexusId: string
  initialData: PaginatedResponse<File>
}

export function FilesPageClient({ plexusId, initialData }: FilesPageClientProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfinitePagination<File>({
    queryKey: ['plexus-files', plexusId],
    endpoint: `/api/plexus/${plexusId}/files`,
    initialData,
  })

  // Flatten pages into single array
  const files = data?.pages.flatMap((page) => page.items) ?? []
  const totalCount = data?.pages[0]?.totalCount ?? 0

  return (
    <VirtualFilesTable
      files={files}
      totalCount={totalCount}
      hasMore={hasNextPage ?? false}
      onLoadMore={() => fetchNextPage()}
      isLoadingMore={isFetchingNextPage}
    />
  )
}
