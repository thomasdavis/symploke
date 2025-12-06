import { db } from '@symploke/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getInstallationOctokit } from '@/lib/github-app'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    console.log('[DEBUG] Session state:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      hasAccessToken: !!session?.accessToken,
    })
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
    // Case-insensitive match since GitHub usernames are case-insensitive
    const installation = await db.gitHubAppInstallation.findFirst({
      where: {
        userId: session.user.id,
        accountLogin: {
          equals: org,
          mode: 'insensitive',
        },
      },
    })

    console.log('[DEBUG] Installation lookup:', {
      lookingFor: org,
      userId: session.user.id,
      found: installation ? installation.accountLogin : null,
    })

    if (!installation) {
      // Fetch all installations for this user to help with debugging
      const allInstallations = await db.gitHubAppInstallation.findMany({
        where: { userId: session.user.id },
        select: { accountLogin: true, accountType: true },
      })

      console.log('[DEBUG] No installation found. Available installations:', allInstallations)

      return NextResponse.json(
        {
          error: {
            code: 'NO_INSTALLATION',
            message: `GitHub App not installed for ${org}. Please install the app first.`,
            availableInstallations: allInstallations.map((inst) => inst.accountLogin),
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

    // Fetch ALL repositories the app has access to (with pagination)
    const allRepos: Array<{
      id: number
      name: string
      full_name: string
      description: string | null
      html_url: string
      private: boolean
      language: string | null
      stargazers_count: number
      fork: boolean
      created_at: string | null
      updated_at: string | null
      pushed_at: string | null
    }> = []

    let page = 1
    const perPage = 100

    while (true) {
      const { data: installationRepos } = await octokit.request('GET /installation/repositories', {
        per_page: perPage,
        page,
      })

      allRepos.push(...installationRepos.repositories)

      // Check if we've fetched all repos
      if (installationRepos.repositories.length < perPage) {
        break
      }

      page++

      // Safety limit to prevent infinite loops
      if (page > 50) {
        console.warn('Hit pagination safety limit at 5000 repos')
        break
      }
    }

    // Get existing repos in this plexus
    const existingRepos = await db.repo.findMany({
      where: { plexusId },
      select: { fullName: true },
    })
    const existingFullNames = new Set(existingRepos.map((r: { fullName: string }) => r.fullName))

    // Filter and map repositories
    const repositories = allRepos
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
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        pushed_at: repo.pushed_at,
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
