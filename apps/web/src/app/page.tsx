import { Button } from '@symploke/ui/Button/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@symploke/ui/Card/Card'

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-24">
      <Card>
        <CardHeader>
          <CardTitle>Symploke</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">AI-powered project connections</p>
          <Button>Get Started</Button>
        </CardContent>
      </Card>
    </main>
  )
}
