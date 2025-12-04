import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { db } from '@symploke/db'
import { auth } from '@/lib/auth'
import { getInstallationOctokit } from '@/lib/github-app'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' } },
        { status: 401 },
      )
    }

    const searchParams = request.nextUrl.searchParams
    const org = searchParams.get('org')
    const plexusId = searchParams.get('plexusId')

    if (!org || !plexusId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Missing org or plexusId parameter' } },
        { status: 400 },
      )
    }

    // Find GitHub App installation for this org/user
    const installation = await db.gitHubAppInstallation.findFirst({
      where: {
        userId: session.user.id,
        accountLogin: org,
      },
    })

    if (!installation) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_INSTALLATION',
            message: `GitHub App not installed for ${org}. Please install the app first.`,
          },
        },
        { status: 404 },
      )
    }

    if (installation.suspended) {
      return NextResponse.json(
        {
          error: {
            code: 'INSTALLATION_SUSPENDED',
            message: 'GitHub App installation is suspended',
          },
        },
        { status: 403 },
      )
    }

    // Get installation-scoped Octokit
    const octokit = await getInstallationOctokit(installation.installationId)

    // Fetch repositories the app has access to
    const { data: installationRepos } = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: 100,
    })

    // Get existing repos in this plexus
    const existingRepos = await db.repo.findMany({
      where: { plexusId },
      select: { fullName: true },
    })
    const existingFullNames = new Set(existingRepos.map((r: { fullName: string }) => r.fullName))

    // Filter and map repositories
    const repositories = installationRepos.repositories
      .filter((repo) => !existingFullNames.has(repo.full_name))
      .map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        private: repo.private,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        fork: repo.fork,
      }))

    return NextResponse.json({ repositories })
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
