'use server'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@symploke/db'

export async function createPlexus(formData: FormData) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  if (!name) {
    throw new Error('Name is required')
  }

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

  redirect('/')
}
