import { db } from '@symploke/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getGitHubApp } from '@/lib/github-app'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    const searchParams = request.nextUrl.searchParams
    const installationId = searchParams.get('installation_id')
    const setupAction = searchParams.get('setup_action')
    const stateParam = searchParams.get('state')

    console.log('[GitHub App Callback]', { installationId, setupAction, stateParam })

    if (!installationId) {
      return NextResponse.json({ error: 'Missing installation_id parameter' }, { status: 400 })
    }

    // Parse state to get org and plexusId
    let state: { org?: string; plexusId?: string } = {}
    if (stateParam) {
      try {
        state = JSON.parse(stateParam)
      } catch (e) {
        console.error('Failed to parse state:', e)
      }
    }

    // Fetch installation details from GitHub
    const app = getGitHubApp()
    const { data: installation } = await app.octokit.request(
      'GET /app/installations/{installation_id}',
      {
        installation_id: parseInt(installationId, 10),
      },
    )

    // Extract account info (handle both User and Organization types)
    const account = installation.account
    const accountLogin = account && 'login' in account ? account.login : account?.name || ''
    const accountType = account && 'type' in account ? account.type : 'Organization'

    console.log('[GitHub App Callback] Installation details:', {
      id: installation.id,
      account: accountLogin,
      accountType,
    })

    // Store or update installation in database
    await db.gitHubAppInstallation.upsert({
      where: {
        installationId: installation.id,
      },
      update: {
        suspended: installation.suspended_at !== null,
        updatedAt: new Date(),
      },
      create: {
        installationId: installation.id,
        userId: session.user.id,
        accountLogin,
        accountType,
        accountId: account?.id || 0,
        suspended: installation.suspended_at !== null,
      },
    })

    console.log('[GitHub App Callback] Installation saved to database')

    // Redirect back to the repos page
    const redirectUrl = state.plexusId ? `/plexus/${state.plexusId}/repos` : '/'

    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (error) {
    console.error('Error handling GitHub App callback:', error)
    return NextResponse.json({ error: 'Failed to process installation' }, { status: 500 })
  }
}
