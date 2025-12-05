import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { db, SyncJobStatus } from '@symploke/db'
import { z } from 'zod'
import { auth } from '@/lib/auth'

const syncConfigSchema = z
  .object({
    maxFiles: z.number().optional(),
    maxContentFiles: z.number().optional(),
    skipContent: z.boolean().optional(),
  })
  .optional()

interface RouteParams {
  params: Promise<{ id: string; repoId: string }>
}

// POST - Create a new sync job
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Parse optional config from request body
    let config = null
    try {
      const body = await request.json()
      const validation = syncConfigSchema.safeParse(body)
      if (validation.success && validation.data) {
        config = validation.data
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Check if there's already a pending or in-progress job for this repo
    const existingJob = await db.repoSyncJob.findFirst({
      where: {
        repoId,
        status: {
          in: [SyncJobStatus.PENDING, SyncJobStatus.FETCHING_TREE, SyncJobStatus.PROCESSING_FILES],
        },
      },
    })

    if (existingJob) {
      return NextResponse.json(
        {
          error: {
            code: 'SYNC_IN_PROGRESS',
            message: 'A sync is already in progress for this repository',
          },
          jobId: existingJob.id,
        },
        { status: 409 },
      )
    }

    // Create new sync job
    const job = await db.repoSyncJob.create({
      data: {
        repoId,
        config,
      },
    })

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        message: 'Sync job created',
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating sync job:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}

// GET - Get sync status for a repo
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

    // Get the latest sync job for this repo
    const latestJob = await db.repoSyncJob.findFirst({
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

    return NextResponse.json({
      repo: {
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        lastIndexed: repo.lastIndexed,
        fileCount: repo._count.files,
      },
      latestJob: latestJob
        ? {
            id: latestJob.id,
            status: latestJob.status,
            totalFiles: latestJob.totalFiles,
            processedFiles: latestJob.processedFiles,
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
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
