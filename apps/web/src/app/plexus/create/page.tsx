import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Card } from '@symploke/ui/Card/Card'
import { CreatePlexusForm } from './CreatePlexusForm'
import './page.css'

export default async function CreatePlexusPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  return (
    <main className="create-plexus-main">
      <div className="create-plexus-container">
        <Card>
          <div className="create-plexus-content">
            <h1 className="create-plexus-title">Create Your Plexus</h1>
            <p className="create-plexus-description">
              A plexus weaves your repositories together, revealing the connections between your
              projects.
            </p>

            <CreatePlexusForm />
          </div>
        </Card>
      </div>
    </main>
  )
}
