import { auth, signOut, signIn } from '@/lib/auth'
import { Button } from '@symploke/ui/Button/Button'
import { ThemeToggle } from './ThemeToggle'
import './Header.css'

export async function Header() {
  const session = await auth()

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-logo">
          <h1 className="header-title">Symploke</h1>
        </div>

        <div className="header-actions">
          <ThemeToggle />
          {session?.user ? (
            <>
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

              <div className="header-buttons">
                <Button variant="ghost" size="sm">
                  Settings
                </Button>
                <form
                  action={async () => {
                    'use server'
                    await signOut()
                  }}
                >
                  <Button type="submit" variant="ghost" size="sm">
                    Sign out
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <form
              action={async () => {
                'use server'
                await signIn('github')
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Sign in
              </Button>
            </form>
          )}
        </div>
      </div>
    </header>
  )
}
