'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu } from '@symploke/ui/Menu/Menu'
import './PlexusSelector.css'

type Plexus = {
  id: string
  name: string
  slug: string
}

type PlexusSelectorProps = {
  currentPlexus: Plexus
  plexuses: Plexus[]
}

export function PlexusSelector({ currentPlexus, plexuses }: PlexusSelectorProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handlePlexusChange = (plexusId: string) => {
    router.push(`/plexus/${plexusId}/weaves`)
    setOpen(false)
  }

  const handleCreateNew = () => {
    router.push('/plexus/create')
    setOpen(false)
  }

  return (
    <div className="plexus-selector">
      <Menu.Root open={open} onOpenChange={setOpen}>
        <Menu.Trigger className="plexus-selector__trigger">
          <span className="plexus-selector__name">{currentPlexus.name}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="plexus-selector__icon"
          >
            <title>Expand menu</title>
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Positioner sideOffset={8}>
            <Menu.Popup className="plexus-selector__menu">
              <div className="plexus-selector__section">
                <div className="plexus-selector__label">Your Plexuses</div>
                {plexuses.map((plexus) => (
                  <Menu.Item
                    key={plexus.id}
                    className="plexus-selector__item"
                    onClick={() => handlePlexusChange(plexus.id)}
                  >
                    <span>{plexus.name}</span>
                    {plexus.id === currentPlexus.id && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <title>Selected</title>
                        <path
                          d="M13 4L6 11L3 8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </Menu.Item>
                ))}
              </div>

              <Menu.Separator className="plexus-selector__separator" />

              <Menu.Item className="plexus-selector__item" onClick={handleCreateNew}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <title>Add</title>
                  <path
                    d="M8 3V13M3 8H13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Create New Plexus</span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}
