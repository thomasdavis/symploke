import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@symploke/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get installations from our database
    const dbInstallations = await db.gitHubAppInstallation.findMany({
      where: { userId: session.user.id },
    })

    // Get installations from GitHub API
    const githubToken = session.accessToken
    let githubInstallations = null
    if (githubToken) {
      const response = await fetch('https://api.github.com/user/installations', {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })
      if (response.ok) {
        const data = await response.json()
        githubInstallations = data.installations
      }
    }

    return NextResponse.json({
      dbInstallations,
      githubInstallations,
      userId: session.user.id,
      userEmail: session.user.email,
    })
  } catch (error) {
    console.error('Error fetching debug installations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
