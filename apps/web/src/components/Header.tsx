import { auth, signOut, signIn } from '@/lib/auth'
import { Button } from '@symploke/ui/Button/Button'

export async function Header() {
  const session = await auth()

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <h1 className="font-sen text-xl font-bold text-foreground">Symploke</h1>
        </div>

        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <div className="flex items-center gap-3">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="text-sm text-foreground">{session.user.name}</span>
              </div>

              <div className="flex items-center gap-2">
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
