import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    // Get user's GitHub access token from session
    const session = await auth()
    const githubToken = session?.accessToken

    if (!githubToken) {
      return NextResponse.json(
        { error: { code: 'NOT_AUTHENTICATED', message: 'GitHub account not connected' } },
        { status: 401 },
      )
    }

    // Fetch user's organizations and user info in parallel
    const [orgsResponse, userResponse] = await Promise.all([
      fetch('https://api.github.com/user/orgs', {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }),
      fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }),
    ])

    if (!orgsResponse.ok || !userResponse.ok) {
      return NextResponse.json(
        { error: { code: 'GITHUB_API_ERROR', message: 'Failed to fetch organizations' } },
        { status: orgsResponse.status },
      )
    }

    const orgs = (await orgsResponse.json()) as Array<{
      login: string
      id: number
      avatar_url: string
      description?: string
    }>
    const user = (await userResponse.json()) as {
      login: string
      id: number
      avatar_url: string
      bio?: string
    }

    // Combine personal account + organizations
    const organizations = [
      {
        login: user.login,
        id: user.id,
        avatar_url: user.avatar_url,
        description: user.bio || '',
        type: 'User' as const,
      },
      ...orgs.map((org) => ({
        login: org.login,
        id: org.id,
        avatar_url: org.avatar_url,
        description: org.description || '',
        type: 'Organization' as const,
      })),
    ]

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error('Error fetching GitHub organizations:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
