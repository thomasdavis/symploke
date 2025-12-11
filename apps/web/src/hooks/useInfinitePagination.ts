import { useInfiniteQuery } from '@tanstack/react-query'
import type { PaginatedResponse } from '@symploke/types/pagination'

export type UseInfinitePaginationOptions<T> = {
  queryKey: string[]
  endpoint: string
  pageSize?: number
  initialData?: PaginatedResponse<T>
  enabled?: boolean
}

export function useInfinitePagination<T>({
  queryKey,
  endpoint,
  pageSize = 50,
  initialData,
  enabled = true,
}: UseInfinitePaginationOptions<T>) {
  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }): Promise<PaginatedResponse<T>> => {
      const params = new URLSearchParams({ limit: String(pageSize) })
      if (pageParam) params.set('cursor', pageParam)

      const response = await fetch(`${endpoint}?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      return response.json()
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: initialData ? { pages: [initialData], pageParams: [undefined] } : undefined,
    enabled,
  })
}
