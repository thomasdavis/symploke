import Link from 'next/link'
import { auth, signOut, signIn } from '@/lib/auth'
import { ThemeToggle } from './ThemeToggle'
import './Header.css'

export async function Header() {
  const session = await auth()

  return (
    <header className="header">
      <div className="header-container">
        <Link href="/" className="header-logo">
          <h1 className="header-title">Symploke</h1>
        </Link>

        <div className="header-actions">
          <ThemeToggle />
          {session?.user ? (
            <nav className="header-nav">
              <Link href="/profile" className="header-nav-link">
                <div className="header-user">
                  {session.user.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="header-avatar"
                    />
                  )}
                  <span className="header-username">{session.user.name}</span>
                </div>
              </Link>
              <Link href="/settings" className="header-nav-link">
                Settings
              </Link>
              <form
                action={async () => {
                  'use server'
                  await signOut()
                }}
              >
                <button type="submit" className="header-nav-link header-nav-button">
                  Sign out
                </button>
              </form>
            </nav>
          ) : (
            <form
              action={async () => {
                'use server'
                await signIn('github')
              }}
            >
              <button type="submit" className="header-nav-link header-nav-button">
                Sign in with GitHub
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  )
}
