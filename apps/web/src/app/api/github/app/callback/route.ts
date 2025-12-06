import { db } from '@symploke/db'
import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getInstallationOctokit } from '@/lib/github-app'

/**
 * GitHub App Installation Callback
 *
 * This route handles the callback after a user installs the GitHub App.
 * GitHub redirects here with:
 * - installation_id: The installation ID
 * - setup_action: Either "install" or "update"
 * - state: Optional state parameter we can use
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const installationId = searchParams.get('installation_id')
    const setupAction = searchParams.get('setup_action')

    if (!installationId) {
      return NextResponse.json({ error: 'Missing installation_id parameter' }, { status: 400 })
    }

    // Get installation details from GitHub
    const octokit = await getInstallationOctokit(parseInt(installationId, 10))
    const { data: installation } = await octokit.rest.apps.getInstallation({
      installation_id: parseInt(installationId, 10),
    })

    // Store installation in database
    const account = installation.account
    const accountLogin =
      account && 'login' in account
        ? account.login
        : account && 'slug' in account
          ? account.slug
          : ''
    const accountType = account && 'type' in account ? account.type : 'Organization'
    const accountId = account?.id || 0

    await db.gitHubAppInstallation.upsert({
      where: {
        installationId: installation.id,
      },
      create: {
        installationId: installation.id,
        userId: session.user.id,
        accountLogin,
        accountType,
        accountId,
        suspended: installation.suspended_at !== null,
      },
      update: {
        accountLogin,
        accountType,
        accountId,
        suspended: installation.suspended_at !== null,
        updatedAt: new Date(),
      },
    })

    // Redirect back to the app
    // You can customize this redirect based on your needs
    const redirectUrl = new URL('/', request.nextUrl.origin)
    redirectUrl.searchParams.set('github_app_installed', 'true')
    redirectUrl.searchParams.set('setup_action', setupAction || 'install')

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('GitHub App installation callback error:', error)
    return NextResponse.json({ error: 'Failed to process installation' }, { status: 500 })
  }
}
