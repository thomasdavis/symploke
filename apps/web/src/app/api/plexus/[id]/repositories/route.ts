import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { db } from '@symploke/db'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getInstallationOctokit } from '@/lib/github-app'

const addRepoSchema = z.object({
  githubId: z.number(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: plexusId } = await params

    // Check user authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' } },
        { status: 401 },
      )
    }

    // Check user is a member of this plexus
    const member = await db.plexusMember.findUnique({
      where: {
        userId_plexusId: {
          userId: session.user.id,
          plexusId,
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: { code: 'NOT_PLEXUS_MEMBER', message: 'Not a member of this plexus' } },
        { status: 403 },
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = addRepoSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: validation.error.message } },
        { status: 400 },
      )
    }

    const { githubId } = validation.data

    // Find all user's GitHub App installations
    const installations = await db.gitHubAppInstallation.findMany({
      where: { userId: session.user.id },
    })

    if (installations.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_INSTALLATIONS',
            message: 'No GitHub App installations found. Please install the app first.',
          },
        },
        { status: 404 },
      )
    }

    // Try to fetch the repo from each installation until we find it
    let githubRepo: { name: string; full_name: string; html_url: string } | null = null

    for (const installation of installations) {
      try {
        const octokit = await getInstallationOctokit(installation.installationId)
        // Fetch repository by ID
        const { data: repoById } = await octokit.request('GET /repositories/{id}', {
          id: githubId,
        })

        githubRepo = repoById
        break
      } catch {
        // If error (404 or other), try next installation
      }
    }

    if (!githubRepo) {
      return NextResponse.json(
        {
          error: {
            code: 'REPO_NOT_FOUND',
            message:
              'Repository not found or not accessible. Make sure the GitHub App is installed for this repository.',
          },
        },
        { status: 404 },
      )
    }

    // Check if repository already exists in this plexus
    const existingRepo = await db.repo.findUnique({
      where: {
        plexusId_fullName: {
          plexusId,
          fullName: githubRepo.full_name,
        },
      },
    })

    if (existingRepo) {
      return NextResponse.json(
        {
          error: {
            code: 'REPO_ALREADY_EXISTS',
            message: 'Repository already added to this plexus',
          },
        },
        { status: 409 },
      )
    }

    // Create repository record
    const repository = await db.repo.create({
      data: {
        plexusId,
        name: githubRepo.name,
        fullName: githubRepo.full_name,
        url: githubRepo.html_url,
        lastIndexed: null,
      },
    })

    return NextResponse.json({ repository }, { status: 201 })
  } catch (error) {
    console.error('Error adding repository:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
