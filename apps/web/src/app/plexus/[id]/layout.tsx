import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@symploke/db'
import { PlexusSidebar } from '@/components/PlexusSidebar'
import { PlexusProviders } from '@/components/PlexusProviders'
import './layout.css'

export default async function PlexusLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  if (!session?.user) {
    redirect('/')
  }

  // Get current plexus
  const plexus = await db.plexus.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  })

  if (!plexus || plexus.members.length === 0) {
    redirect('/')
  }

  // Get all plexuses for the user (for the dropdown)
  const userPlexuses = await db.plexus.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <PlexusProviders plexusId={id}>
      <div className="plexus-layout">
        <PlexusSidebar currentPlexus={plexus} userPlexuses={userPlexuses} />
        <main className="plexus-main">{children}</main>
      </div>
    </PlexusProviders>
  )
}
