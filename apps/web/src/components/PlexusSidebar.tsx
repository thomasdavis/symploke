'use client'

import { PlexusSelector } from './PlexusSelector'
import { PlexusNav } from './PlexusNav'
import './PlexusSidebar.css'

type Plexus = {
  id: string
  name: string
  slug: string
}

type PlexusSidebarProps = {
  currentPlexus: Plexus
  userPlexuses: Plexus[]
}

export function PlexusSidebar({ currentPlexus, userPlexuses }: PlexusSidebarProps) {
  return (
    <aside className="plexus-sidebar">
      <PlexusSelector currentPlexus={currentPlexus} plexuses={userPlexuses} />
      <PlexusNav plexusId={currentPlexus.id} />
    </aside>
  )
}
