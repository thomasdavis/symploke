import { ChunkJobStatus, db } from '@symploke/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string; repoId: string }>
}

// POST - Create a new chunk/embedding job
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

    // Check if there's already a pending or in-progress job for this repo
    const existingJob = await db.chunkSyncJob.findFirst({
      where: {
        repoId,
        status: {
          in: [ChunkJobStatus.PENDING, ChunkJobStatus.CHUNKING, ChunkJobStatus.EMBEDDING],
        },
      },
    })

    if (existingJob) {
      return NextResponse.json(
        {
          error: {
            code: 'EMBED_IN_PROGRESS',
            message: 'An embedding job is already in progress for this repository',
          },
          jobId: existingJob.id,
        },
        { status: 409 },
      )
    }

    // Create new chunk sync job
    const job = await db.chunkSyncJob.create({
      data: {
        repoId,
      },
    })

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        message: 'Embedding job created',
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating embedding job:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}

// GET - Get embedding status for a repo
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    // Get the latest chunk sync job for this repo
    const latestJob = await db.chunkSyncJob.findFirst({
      where: { repoId },
      orderBy: { createdAt: 'desc' },
    })

    // Get repo info
    const repo = await db.repo.findUnique({
      where: { id: repoId },
      select: {
        id: true,
        name: true,
        fullName: true,
        lastIndexed: true,
        _count: { select: { files: true } },
      },
    })

    if (!repo) {
      return NextResponse.json(
        { error: { code: 'REPO_NOT_FOUND', message: 'Repository not found' } },
        { status: 404 },
      )
    }

    // Get chunk count
    const chunkCount = await db.chunk.count({
      where: {
        file: { repoId },
      },
    })

    return NextResponse.json({
      repo: {
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        lastIndexed: repo.lastIndexed,
        fileCount: repo._count.files,
        chunkCount,
      },
      latestJob: latestJob
        ? {
            id: latestJob.id,
            status: latestJob.status,
            totalFiles: latestJob.totalFiles,
            processedFiles: latestJob.processedFiles,
            chunksCreated: latestJob.chunksCreated,
            embeddingsGenerated: latestJob.embeddingsGenerated,
            skippedFiles: latestJob.skippedFiles,
            failedFiles: latestJob.failedFiles,
            error: latestJob.error,
            startedAt: latestJob.startedAt,
            completedAt: latestJob.completedAt,
            createdAt: latestJob.createdAt,
          }
        : null,
    })
  } catch (error) {
    console.error('Error getting embedding status:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
