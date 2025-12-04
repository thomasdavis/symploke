import { z } from 'zod'

export const PlexusSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.coerce.date(),
})

export const CreatePlexusSchema = z.object({
  name: z.string().min(1, 'Name is required'),
})

export type Plexus = z.infer<typeof PlexusSchema>
export type CreatePlexusInput = z.infer<typeof CreatePlexusSchema>
