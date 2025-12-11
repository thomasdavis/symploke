'use client'

import { PlexusSelector } from './PlexusSelector'
import { PlexusNav } from './PlexusNav'
import { RunWeavesButton } from './RunWeavesButton'
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
      <div className="plexus-sidebar__action">
        <RunWeavesButton plexusId={currentPlexus.id} variant="primary" size="sm" />
      </div>
      <PlexusNav plexusId={currentPlexus.id} />
    </aside>
  )
}
