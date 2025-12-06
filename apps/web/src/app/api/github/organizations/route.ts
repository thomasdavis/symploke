import { db } from '@symploke/db'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

type GitHubOrg = {
  login: string
  id: number
  avatar_url: string
  description?: string
}

type GitHubUser = {
  login: string
  id: number
  avatar_url: string
  bio?: string
}

// Helper to parse GitHub Link header for pagination
function getNextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  const links = linkHeader.split(',')
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel="next"/)
    if (match?.[1]) return match[1]
  }
  return null
}

export async function GET() {
  try {
    // Get user's GitHub access token from session
    const session = await auth()
    const githubToken = session?.accessToken

    if (!githubToken || !session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'NOT_AUTHENTICATED', message: 'GitHub account not connected' } },
        { status: 401 },
      )
    }

    // Fetch user info first
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: { code: 'GITHUB_API_ERROR', message: 'Failed to fetch user info' } },
        { status: userResponse.status },
      )
    }

    const user = (await userResponse.json()) as GitHubUser

    // Fetch ALL organizations the user is a member of (with pagination)
    const allOrgs: GitHubOrg[] = []
    let nextUrl: string | null = 'https://api.github.com/user/orgs?per_page=100'

    while (nextUrl) {
      const orgsResponse = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (!orgsResponse.ok) {
        return NextResponse.json(
          { error: { code: 'GITHUB_API_ERROR', message: 'Failed to fetch organizations' } },
          { status: orgsResponse.status },
        )
      }

      const orgs = (await orgsResponse.json()) as GitHubOrg[]
      allOrgs.push(...orgs)

      // Check for next page
      nextUrl = getNextPageUrl(orgsResponse.headers.get('link'))

      // Safety limit to prevent infinite loops
      if (allOrgs.length > 1000) {
        console.warn('Hit pagination safety limit at 1000 orgs')
        break
      }
    }

    // Also fetch organizations where user has installed the GitHub App
    // (they might not be a member but have installation access)
    const installations = await db.gitHubAppInstallation.findMany({
      where: {
        userId: session.user.id,
        suspended: false,
      },
      select: {
        accountLogin: true,
        accountId: true,
        accountType: true,
      },
    })

    // Build set of org logins we already have
    const existingLogins = new Set([user.login, ...allOrgs.map((o) => o.login.toLowerCase())])

    // Add installations that aren't already in the list
    const installationOrgs = installations
      .filter((inst) => !existingLogins.has(inst.accountLogin.toLowerCase()))
      .map((inst) => ({
        login: inst.accountLogin,
        id: inst.accountId,
        avatar_url: `https://avatars.githubusercontent.com/u/${inst.accountId}?v=4`,
        description: 'GitHub App installed',
        type: inst.accountType as 'User' | 'Organization',
        hasInstallation: true,
      }))

    // Combine personal account + member orgs + installation orgs
    const organizations = [
      {
        login: user.login,
        id: user.id,
        avatar_url: user.avatar_url,
        description: user.bio || '',
        type: 'User' as const,
      },
      ...allOrgs.map((org) => ({
        login: org.login,
        id: org.id,
        avatar_url: org.avatar_url,
        description: org.description || '',
        type: 'Organization' as const,
      })),
      ...installationOrgs,
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
