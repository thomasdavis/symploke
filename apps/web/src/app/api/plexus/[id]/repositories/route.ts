import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { db } from '@symploke/db'
import { z } from 'zod'

// TODO: Import auth to check user permissions
// import { auth } from '@/auth'

const addRepoSchema = z.object({
  githubId: z.number(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: plexusId } = await params

    // TODO: Check user has access to this plexus
    // const session = await auth()
    // if (!session?.user) {
    //   return NextResponse.json(
    //     { error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' } },
    //     { status: 401 }
    //   )
    // }

    // const member = await db.plexusMember.findUnique({
    //   where: {
    //     userId_plexusId: {
    //       userId: session.user.id,
    //       plexusId,
    //     },
    //   },
    // })

    // if (!member) {
    //   return NextResponse.json(
    //     { error: { code: 'NOT_PLEXUS_MEMBER', message: 'Not a member of this plexus' } },
    //     { status: 403 }
    //   )
    // }

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

    // TODO: Fetch repo metadata from GitHub to verify it exists and user has access
    // const githubToken = session.user.githubAccessToken
    // const repoResponse = await fetch(`https://api.github.com/repositories/${githubId}`, {
    //   headers: {
    //     Authorization: `Bearer ${githubToken}`,
    //     Accept: 'application/vnd.github.v3+json',
    //   },
    // })

    // if (!repoResponse.ok) {
    //   if (repoResponse.status === 404) {
    //     return NextResponse.json(
    //       { error: { code: 'REPO_NOT_FOUND', message: 'Repository not found' } },
    //       { status: 404 }
    //     )
    //   }
    //   if (repoResponse.status === 401 || repoResponse.status === 403) {
    //     return NextResponse.json(
    //       { error: { code: 'GITHUB_FORBIDDEN', message: 'No access to this repository' } },
    //       { status: 403 }
    //     )
    //   }
    //   return NextResponse.json(
    //     { error: { code: 'GITHUB_API_ERROR', message: 'Failed to fetch repository' } },
    //     { status: repoResponse.status }
    //   )
    // }

    // const githubRepo = await repoResponse.json()

    // TEMPORARY: Use mock data
    const githubRepo = {
      id: githubId,
      name: 'mock-repo',
      full_name: 'user/mock-repo',
      html_url: `https://github.com/user/mock-repo`,
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
