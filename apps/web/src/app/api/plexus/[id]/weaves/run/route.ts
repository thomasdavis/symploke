import { db } from '@symploke/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST - Trigger a new weave discovery run
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

    // Check if there's already a running weave discovery for this plexus
    const existingRun = await db.weaveDiscoveryRun.findFirst({
      where: {
        plexusId,
        status: 'RUNNING',
      },
    })

    if (existingRun) {
      return NextResponse.json(
        {
          error: {
            code: 'WEAVE_RUN_IN_PROGRESS',
            message: 'A weave discovery run is already in progress for this plexus',
          },
          runId: existingRun.id,
          startedAt: existingRun.startedAt,
        },
        { status: 409 },
      )
    }

    // Trigger the weave run via the engine service
    const engineUrl = process.env.ENGINE_URL || 'http://localhost:3001'

    const response = await fetch(`${engineUrl}/trigger-weaves/${plexusId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 409) {
        return NextResponse.json(
          {
            error: {
              code: 'WEAVE_RUN_IN_PROGRESS',
              message: errorData.error || 'A weave discovery run is already in progress',
            },
            runId: errorData.runId,
            startedAt: errorData.startedAt,
          },
          { status: 409 },
        )
      }

      return NextResponse.json(
        {
          error: {
            code: 'ENGINE_ERROR',
            message: errorData.error || 'Failed to trigger weave discovery',
          },
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json(
      {
        status: 'started',
        message: 'Weave discovery started',
        plexusId,
        ...data,
      },
      { status: 202 },
    )
  } catch (error) {
    console.error('Error triggering weave run:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}

// GET - Get weave discovery status for this plexus
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    // Check for running run
    const runningRun = await db.weaveDiscoveryRun.findFirst({
      where: {
        plexusId,
        status: 'RUNNING',
      },
      select: {
        id: true,
        startedAt: true,
        repoPairsTotal: true,
        repoPairsChecked: true,
      },
    })

    if (runningRun) {
      return NextResponse.json({
        status: 'running',
        runId: runningRun.id,
        startedAt: runningRun.startedAt,
        progress: {
          total: runningRun.repoPairsTotal,
          checked: runningRun.repoPairsChecked,
        },
      })
    }

    // Get latest run
    const latestRun = await db.weaveDiscoveryRun.findFirst({
      where: { plexusId },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        weavesSaved: true,
        error: true,
      },
    })

    return NextResponse.json({
      status: 'idle',
      latestRun: latestRun
        ? {
            id: latestRun.id,
            status: latestRun.status,
            startedAt: latestRun.startedAt,
            completedAt: latestRun.completedAt,
            weavesSaved: latestRun.weavesSaved,
            error: latestRun.error,
          }
        : null,
    })
  } catch (error) {
    console.error('Error getting weave status:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
