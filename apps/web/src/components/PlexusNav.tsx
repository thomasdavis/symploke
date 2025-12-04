'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import './PlexusNav.css'

type PlexusNavProps = {
  plexusId: string
}

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Dashboard</title>
        <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: '/weaves',
    label: 'Weaves',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Weaves</title>
        <path
          d="M6 4L10 8L14 4M6 12L10 16L14 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/repos',
    label: 'Repos',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Repos</title>
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 8H17" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: '/files',
    label: 'Files',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Files</title>
        <path
          d="M5 3H11L15 7V17H5V3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M11 3V7H15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/members',
    label: 'Members',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Members</title>
        <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M4 17C4 14 6.5 12 10 12C13.5 12 16 14 16 17"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

export function PlexusNav({ plexusId }: PlexusNavProps) {
  const pathname = usePathname()

  return (
    <nav className="plexus-nav">
      {navItems.map((item) => {
        const href = `/plexus/${plexusId}${item.href}`
        const isActive = pathname === href

        return (
          <Link
            key={item.href}
            href={href}
            className={`plexus-nav__item ${isActive ? 'plexus-nav__item--active' : ''}`}
          >
            <span className="plexus-nav__icon">{item.icon}</span>
            <span className="plexus-nav__label">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
