import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0, // Always refetch, but show cached data instantly
        refetchOnWindowFocus: true,
        refetchOnMount: true,
      },
    },
  })
}
