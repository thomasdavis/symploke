import { App } from '@octokit/app'
import { Octokit } from '@octokit/rest'

// Singleton GitHub App instance
let appInstance: App | null = null

/**
 * Get or create the GitHub App instance
 */
export function getGitHubApp(): App {
  if (!appInstance) {
    const appId = process.env.AUTH_GITHUB_APP_ID
    const privateKey = process.env.AUTH_GITHUB_APP_PRIVATE_KEY

    if (!appId || !privateKey) {
      throw new Error('Missing GitHub App credentials')
    }

    appInstance = new App({
      appId,
      privateKey,
    })
  }

  return appInstance
}

/**
 * Get an installation-scoped Octokit instance
 * This gives access to ONLY the repos the user selected during installation
 */
export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const app = getGitHubApp()

  const octokit = await app.getInstallationOctokit(installationId)

  return octokit as unknown as Octokit
}

/**
 * Get an authenticated user Octokit instance using OAuth token
 * This is for user-level operations like listing orgs
 */
export function getUserOctokit(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
  })
}

/**
 * List all installations for the authenticated GitHub App
 */
export async function listInstallations() {
  const app = getGitHubApp()
  const octokit = await app.getInstallationOctokit(0) // App-level access

  const { data } = await octokit.request('GET /app/installations')
  return data
}
