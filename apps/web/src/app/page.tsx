import { Button } from '@symploke/ui/Button/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@symploke/ui/Card/Card'
import { auth, signIn, signOut } from '@/lib/auth'

export default async function Home() {
  const session = await auth()

  return (
    <main className="flex min-h-screen items-center justify-center p-24">
      <Card>
        <CardHeader>
          <CardTitle>Symploke</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">AI-powered project connections</p>
          {session?.user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{session.user.name}</p>
                  <p className="text-sm text-muted-foreground">{session.user.email}</p>
                </div>
              </div>
              <form
                action={async () => {
                  'use server'
                  await signOut()
                }}
              >
                <Button type="submit" variant="secondary">
                  Sign out
                </Button>
              </form>
            </div>
          ) : (
            <form
              action={async () => {
                'use server'
                await signIn('github')
              }}
            >
              <Button type="submit">Sign in with GitHub</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
