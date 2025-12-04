import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { db } from '@symploke/db'

// TODO: Import auth to get GitHub access token
// import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const org = searchParams.get('org')
    const plexusId = searchParams.get('plexusId')

    if (!org || !plexusId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Missing org or plexusId parameter' } },
        { status: 400 },
      )
    }

    // TODO: Get user's GitHub access token from session
    // const session = await auth()
    // const githubToken = session?.user?.githubAccessToken

    // if (!githubToken) {
    //   return NextResponse.json(
    //     { error: { code: 'NOT_AUTHENTICATED', message: 'GitHub account not connected' } },
    //     { status: 401 }
    //   )
    // }

    // Determine if personal or org repos
    // const isPersonal = org === session.user.githubLogin
    // const endpoint = isPersonal
    //   ? 'https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100'
    //   : `https://api.github.com/orgs/${org}/repos?sort=updated&per_page=100`

    // const response = await fetch(endpoint, {
    //   headers: {
    //     Authorization: `Bearer ${githubToken}`,
    //     Accept: 'application/vnd.github.v3+json',
    //   },
    // })

    // if (!response.ok) {
    //   if (response.status === 401) {
    //     return NextResponse.json(
    //       { error: { code: 'GITHUB_TOKEN_EXPIRED', message: 'GitHub token expired' } },
    //       { status: 401 }
    //     )
    //   }
    //   return NextResponse.json(
    //     { error: { code: 'GITHUB_API_ERROR', message: 'Failed to fetch repositories' } },
    //     { status: response.status }
    //     )
    // }

    // const allRepos = await response.json()

    // Get existing repos in this plexus
    const existingRepos = await db.repo.findMany({
      where: { plexusId },
      select: { fullName: true },
    })
    const existingFullNames = new Set(existingRepos.map((r: { fullName: string }) => r.fullName))

    // Filter out already-added repos
    // const repositories = allRepos
    //   .filter((repo: any) => !existingFullNames.has(repo.full_name))
    //   .map((repo: any) => ({
    //     id: repo.id,
    //     name: repo.name,
    //     full_name: repo.full_name,
    //     description: repo.description,
    //     html_url: repo.html_url,
    //     private: repo.private,
    //     language: repo.language,
    //     stargazers_count: repo.stargazers_count,
    //     fork: repo.fork,
    //   }))

    // return NextResponse.json({ repositories })

    // TEMPORARY: Return mock data for development
    const mockRepos = [
      {
        id: 111111,
        name: 'symploke',
        full_name: `${org}/symploke`,
        description: 'Code search and analysis platform',
        html_url: `https://github.com/${org}/symploke`,
        private: false,
        language: 'TypeScript',
        stargazers_count: 42,
        fork: false,
      },
      {
        id: 222222,
        name: 'example-repo',
        full_name: `${org}/example-repo`,
        description: 'An example repository',
        html_url: `https://github.com/${org}/example-repo`,
        private: true,
        language: 'JavaScript',
        stargazers_count: 10,
        fork: false,
      },
    ].filter((repo) => !existingFullNames.has(repo.full_name))

    return NextResponse.json({ repositories: mockRepos })
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
