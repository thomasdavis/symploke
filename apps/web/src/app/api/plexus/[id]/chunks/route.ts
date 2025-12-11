import { db } from '@symploke/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import type { PaginatedResponse } from '@symploke/types/pagination'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Parse pagination params from URL
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined
    const limitParam = searchParams.get('limit')
    const limit = Math.min(limitParam ? parseInt(limitParam, 10) : DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

    // Fetch chunks with cursor-based pagination
    const chunks = await db.chunk.findMany({
      where: {
        file: {
          repo: { plexusId },
        },
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      include: {
        file: {
          select: {
            path: true,
            repo: {
              select: {
                name: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1, // Fetch one extra to determine hasMore
    })

    // Determine if there are more items
    const hasMore = chunks.length > limit
    const items = hasMore ? chunks.slice(0, -1) : chunks
    const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null

    // Get total count
    const totalCount = await db.chunk.count({
      where: { file: { repo: { plexusId } } },
    })

    const response: PaginatedResponse<(typeof items)[0]> = {
      items,
      nextCursor,
      totalCount,
      hasMore,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching chunks:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch chunks' } },
      { status: 500 },
    )
  }
}
