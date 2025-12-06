import { db } from '@symploke/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string; repoId: string }>
}

// DELETE - Remove a repository from a plexus
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: plexusId, repoId } = await params

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

    // Check repo exists and belongs to this plexus
    const repo = await db.repo.findFirst({
      where: {
        id: repoId,
        plexusId,
      },
    })

    if (!repo) {
      return NextResponse.json(
        { error: { code: 'REPO_NOT_FOUND', message: 'Repository not found' } },
        { status: 404 },
      )
    }

    // Delete the repository
    // Prisma will cascade delete related records (files, syncJobs, chunkSyncJobs, weaves)
    await db.repo.delete({
      where: { id: repoId },
    })

    return NextResponse.json({
      message: 'Repository deleted successfully',
      repoId,
    })
  } catch (error) {
    console.error('Error deleting repository:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
