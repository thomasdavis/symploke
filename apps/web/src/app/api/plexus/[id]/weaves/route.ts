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
    const [repos, discoveryRuns, weaves] = await Promise.all([
      // Get all repos for this plexus with file counts (for graph view)
      db.repo.findMany({
        where: { plexusId },
        include: {
          _count: {
            select: { files: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),

      // Get discovery runs (completed only)
      db.weaveDiscoveryRun.findMany({
        where: {
          plexusId,
          status: 'COMPLETED',
        },
        orderBy: {
          startedAt: 'desc',
        },
        take: 20,
      }),

      // Get all weaves for this plexus (excluding dismissed)
      // Include glossary data for showing breakdowns in glossary_alignment weaves
      db.weave.findMany({
        where: {
          plexusId,
          dismissed: false,
        },
        include: {
          sourceRepo: {
            select: {
              name: true,
              fullName: true,
              glossary: {
                select: {
                  status: true,
                  empirics: true,
                  philosophy: true,
                  poetics: true,
                  futureVision: true,
                  confidence: true,
                },
              },
            },
          },
          targetRepo: {
            select: {
              name: true,
              fullName: true,
              glossary: {
                select: {
                  status: true,
                  empirics: true,
                  philosophy: true,
                  poetics: true,
                  futureVision: true,
                  confidence: true,
                },
              },
            },
          },
        },
        orderBy: {
          score: 'desc',
        },
      }),
    ])

    return NextResponse.json({ repos, discoveryRuns, weaves })
  } catch (error) {
    console.error('Error fetching weaves data:', error)
    return NextResponse.json(
      { error: { code: 'UNKNOWN_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
