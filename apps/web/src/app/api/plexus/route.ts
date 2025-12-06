import { auth } from '@/lib/auth'
import { db } from '@symploke/db'
import { jsonOk, jsonError } from '@symploke/api/responses'
import { CreatePlexusSchema, PlexusSchema } from '@symploke/api/schemas'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return jsonError('Unauthorized', 401)
  }

  const body = await req.json()
  const parsed = CreatePlexusSchema.safeParse(body)

  if (!parsed.success) {
    return jsonError('Invalid request body', 422)
  }

  const { name } = parsed.data

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Create plexus and add user as owner
  const plexus = await db.plexus.create({
    data: {
      name,
      slug,
      members: {
        create: {
          userId: session.user.id,
          role: 'OWNER',
        },
      },
    },
  })

  return jsonOk(PlexusSchema.parse(plexus))
}
