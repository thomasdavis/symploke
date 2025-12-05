import { App } from '@octokit/app'
import type { Octokit } from '@octokit/rest'
import { config } from '../config.js'

let appInstance: App | null = null

/**
 * Get or create the GitHub App instance
 */
export function getGitHubApp(): App {
  if (!appInstance) {
    appInstance = new App({
      appId: config.AUTH_GITHUB_APP_ID,
      privateKey: config.AUTH_GITHUB_APP_PRIVATE_KEY,
    })
  }
  return appInstance
}

/**
 * Get an installation-scoped Octokit instance
 */
export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const app = getGitHubApp()
  const octokit = await app.getInstallationOctokit(installationId)
  return octokit as unknown as Octokit
}

/**
 * Extract owner and repo name from full name
 */
export function parseRepoFullName(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split('/')
  if (!owner || !repo) {
    throw new Error(`Invalid repo full name: ${fullName}`)
  }
  return { owner, repo }
}
