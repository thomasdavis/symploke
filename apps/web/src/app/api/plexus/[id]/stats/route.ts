import { db } from '@symploke/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Fetch all data in parallel
    const [lastRun, repos, weaves] = await Promise.all([
      // Get the most recent completed run
      db.weaveDiscoveryRun.findFirst({
        where: { plexusId, status: 'COMPLETED' },
        orderBy: { startedAt: 'desc' },
      }),

      // Get all repos in the plexus
      db.repo.findMany({
        where: { plexusId },
        select: { id: true, name: true },
      }),

      // Get all weaves for this plexus
      db.weave.findMany({
        where: { plexusId },
        select: {
          id: true,
          sourceRepoId: true,
          targetRepoId: true,
          type: true,
          score: true,
          discoveryRunId: true,
        },
      }),
    ])

    // Format last run date
    const lastRunDate = lastRun
      ? new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }).format(lastRun.startedAt)
      : null

    return NextResponse.json({
      weaves,
      repos,
      lastRunId: lastRun?.id ?? null,
      lastRunDate,
    })
  } catch (error) {
    console.error('Error fetching stats data:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
