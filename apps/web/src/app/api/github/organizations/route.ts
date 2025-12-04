import { NextResponse } from 'next/server'

// TODO: Import auth to get GitHub access token
// import { auth } from '@/auth'

export async function GET() {
  try {
    // TODO: Get user's GitHub access token from session
    // const session = await auth()
    // const githubToken = session?.user?.githubAccessToken

    // if (!githubToken) {
    //   return NextResponse.json(
    //     { error: { code: 'NOT_AUTHENTICATED', message: 'GitHub account not connected' } },
    //     { status: 401 }
    //   )
    // }

    // Fetch user's organizations
    // const [orgsResponse, userResponse] = await Promise.all([
    //   fetch('https://api.github.com/user/orgs', {
    //     headers: {
    //       Authorization: `Bearer ${githubToken}`,
    //       Accept: 'application/vnd.github.v3+json',
    //     },
    //   }),
    //   fetch('https://api.github.com/user', {
    //     headers: {
    //       Authorization: `Bearer ${githubToken}`,
    //       Accept: 'application/vnd.github.v3+json',
    //     },
    //   }),
    // ])

    // if (!orgsResponse.ok || !userResponse.ok) {
    //   return NextResponse.json(
    //     { error: { code: 'GITHUB_API_ERROR', message: 'Failed to fetch organizations' } },
    //     { status: orgsResponse.status }
    //   )
    // }

    // const orgs = await orgsResponse.json()
    // const user = await userResponse.json()

    // // Combine personal account + organizations
    // const organizations = [
    //   {
    //     login: user.login,
    //     id: user.id,
    //     avatar_url: user.avatar_url,
    //     description: user.bio || '',
    //     type: 'User' as const,
    //   },
    //   ...orgs.map((org: any) => ({
    //     login: org.login,
    //     id: org.id,
    //     avatar_url: org.avatar_url,
    //     description: org.description || '',
    //     type: 'Organization' as const,
    //   })),
    // ]

    // return NextResponse.json({ organizations })

    // TEMPORARY: Return mock data for development
    return NextResponse.json({
      organizations: [
        {
          login: 'thomasdavis',
          id: 123456,
          avatar_url: 'https://avatars.githubusercontent.com/u/123456',
          description: 'Personal account',
          type: 'User',
        },
        {
          login: 'symploke-org',
          id: 789012,
          avatar_url: 'https://avatars.githubusercontent.com/u/789012',
          description: 'Symploke Organization',
          type: 'Organization',
        },
      ],
    })
  } catch (error) {
    console.error('Error fetching GitHub organizations:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
