'use client'

import type { ReactNode } from 'react'
import { WeaveDiscoveryProvider } from '@/contexts/WeaveDiscoveryContext'

interface PlexusProvidersProps {
  plexusId: string
  children: ReactNode
}

export function PlexusProviders({ plexusId, children }: PlexusProvidersProps) {
  return <WeaveDiscoveryProvider plexusId={plexusId}>{children}</WeaveDiscoveryProvider>
}
