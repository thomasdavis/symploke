import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@symploke/db'
import { WeaveRunClient } from './WeaveRunClient'

export default async function WeaveRunPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: plexusId } = await params

  if (!session?.user) {
    redirect('/')
  }

  // Verify user has access to this plexus
  const membership = await db.plexusMember.findFirst({
    where: {
      plexusId,
      userId: session.user.id,
    },
  })

  if (!membership) {
    redirect('/')
  }

  // Get plexus info
  const plexus = await db.plexus.findUnique({
    where: { id: plexusId },
    select: { id: true, name: true, slug: true },
  })

  if (!plexus) {
    redirect('/')
  }

  return <WeaveRunClient plexusId={plexusId} plexusName={plexus.name} />
}
