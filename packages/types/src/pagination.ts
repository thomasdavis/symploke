export type PaginatedResponse<T> = {
  items: T[]
  nextCursor: string | null
  totalCount: number
  hasMore: boolean
}

export type CursorPaginationParams = {
  cursor?: string
  limit?: number
}
