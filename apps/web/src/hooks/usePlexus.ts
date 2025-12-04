import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PlexusSchema, type CreatePlexusInput } from '@symploke/api/schemas'
import { useRouter } from 'next/navigation'

export function useCreatePlexus() {
  const qc = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (input: CreatePlexusInput) => {
      const res = await fetch('/api/plexus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create plexus')
      }

      const json = await res.json()
      return PlexusSchema.parse(json.data)
    },
    onSuccess(plexus) {
      // Invalidate any plexus-related queries
      qc.invalidateQueries({ queryKey: ['plexus'] })
      // Navigate to plexus dashboard
      router.push(`/plexus/${plexus.id}/dashboard`)
    },
  })
}
